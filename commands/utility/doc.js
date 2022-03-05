// imports
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// documentations infos (maybe put this in another file in the future ?)
// docId: { url, getEmbed }
// in the url, %s will be replaced later by the user query
const documentations = {
    'MDN': {
        url: 'https://developer.mozilla.org/api/v1/search?q=%s&locale=fr',
        async getEmbed(results) {
            // get found page results
            const { documents: pages } = results;

            // if no page found, throw (will be catched and displayed to the user)
            if(pages.length === 0) throw 'Aucun résultat n\'a été trouvé';

            // get first page result
            const [ page ] = pages;
            
            // get page infos
            const { title, summary, mdn_url } = page;

            const embed = {
                author: {
                    name: `MDN - ${title}`,
                    icon_url: 'https://developer.mozilla.org/apple-touch-icon.6803c6f0.png', // not a thumbnail because it makes the block code width smaller.
                    url: `https://developer.mozilla.org${mdn_url}`
                },
                description: summary + `\n\n[lire plus](https://developer.mozilla.org${mdn_url})\n`,
                fields: []
            }
            
            // scrapping
            // generate document
            const { window: { document } } = await JSDOM.fromURL(`https://developer.mozilla.org${mdn_url}`, { resources: 'usable' });
            
            // get example (can be from a code tag, or a live editor iframe)
            // get the code editor url, if present
            const editorUrl = document.querySelector('iframe.interactive')?.src;
            // get all pre > code tags
            const examplePreElement = document.querySelector('pre');

            // used to resolve example language
            const availableLanguages = ['html', 'css', 'js'];

            // element that contains the code
            let codeElement;
            // language
            let language;

            // if live editor
            if(editorUrl) {
                // get editor iframe content 
                const { window: { document: editorDocument } } = await JSDOM.fromURL(editorUrl);
                // search for a code element
                const exampleCodeElement = editorDocument.querySelector('code');

                // resolve code's language
                // will be undefined if the editor has tabs
                language = availableLanguages.find(language => exampleCodeElement.id.includes(language) || exampleCodeElement.className.includes(language));
                // if undefined, it's a tabbed editor, so get the first tab id. The id will be the language name
                language ??= editorDocument.querySelector('button[role="tab"]').id;
                codeElement = exampleCodeElement;
            } else if(examplePreElement) { // if static example pre element
                // resolve code's language
                language = availableLanguages.find(language => examplePreElement.className.includes(language));
                // get the html element that contains the code
                codeElement = examplePreElement;
            }

            // get the code only if a codeElement is present
            const exampleCode = codeElement?.textContent;
            // add a field to the embed, containing the code, only if there is one
            if(exampleCode) embed.fields.push({ name: 'Exemple', value: '```' + language + '\n' + exampleCode + '\n```' });
            
            // finally return the embed
            return embed;
        }
    }
}

// choices for command option 'doc'.
// WARNING : BECAUSE OF DISCORD LIMITATIONS, DOCUMENTATIONS ARE LIMITED TO 25.
// IF MORE ARE NEEDED IN THE FUTURE, USE INTERACTIONS AUTOCOMPLETE INSTEAD.
const documentationChoices = Object.keys(documentations).map(d => { return { name: d, value: d } });

// command
module.exports = {
    description: 'Cherche dans la documentation spécifiée.',
    type: 'CHAT_INPUT',
    options: [
        { name: 'doc', description: 'Choisissez une documentation.', type: 'STRING', required: true, choices: documentationChoices },
        { name: 'recherche', description: 'Effectuez votre recherche', type: 'STRING', required: true }
    ],
    async run({ client, interaction }) {
        // get parameters
        const docName = interaction.options.getString('doc');
        const query = interaction.options.getString('recherche');

        // close guards
        if(!docName) return interaction.error('Aucune documentation n\'a été spécifiée.');
        if(!query) return interaction.error('Aucune recherche n\'a été spécifiée.');

        // get the doumentation url, and the getEmbed function.
        // If documentation not found, provide an empty object to prevent the 'Cannot destructure undefined' error.  
        const { url, getEmbed } = documentations[docName] ?? { };

        // if doc not found, error. It's logically always found, so it will likely nerver be executed. But just in case.
        // ps : in the future, we may use autocomplete, wich allows users to type anything. Never remove this line.
        if(!url || !getEmbed) return interaction.error(`La documentation ${docName} n'a pas été trouvée.`);

        // generate query
        const queryUrl = url.replace('%s', encodeURI(query));

        // the following block could take a few time to execute. I defer the interaction just in case.
        await interaction.deferReply();

        // do the request
        try {
            // will throw if network error
            const res = await fetch(queryUrl);

            // if code not OK, throw, will be catched later.
            if(res.statusText != 'OK') throw 'Une erreur est survenue en tentant d\'accéder à la documentation.';

            // get the JSON
            const requestJson = await res.json();

            // format the results
            const embed = {
                ...await getEmbed(requestJson),
                color: client.config.colors.main,
                footer: {
                    icon_url: client.user.displayAvatarURL(),
                    text: client.config.footer
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch(err) {
            if(typeof err === 'string') interaction.error(err, { replied: false });
            else {
                console.log(err);
                interaction.error('Une erreur est survenue.', { replied: false });
            }
        }
    }
}