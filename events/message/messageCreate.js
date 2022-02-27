module.exports = async (client, message) => {
  if (!message.author.bot) {

    const usersDB = await client.pool.query(`SELECT * FROM users WHERE id = ${message.author.id}`);
    let userDB = usersDB.rows[0];

    if (!userDB) {
      await client.pool.query(`INSERT INTO users(id, credits, experience, level) VALUES (${message.author.id}, 0, 0, 1)`);
      userDB = { id: message.member.id, credits: 0, experience: 0, level: 1 };
    }

    const xpObjectif = userDB.level ** 2 * 100;

    userDB.experience += Math.floor(Math.random() * 5) + 5;

    await client.pool.query(`UPDATE users SET experience = ${userDB.experience} WHERE id = ${message.member.id}`);

    if (userDB.experience > xpObjectif) {
      await client.pool.query(`UPDATE users SET credits = ${userDB.credits + 2}, level = ${userDB.level + 1} WHERE id = ${message.member.id}`);
      message.channel.send(`Bravo ${message.member.toString()} ! Vous venez de passer au niveau **${userDB.level + 1}**. Vous gagnez \`2\` credits en récompense.`);
    }
  }

  if (message.author.id == client.config.disboard_id) {
    console.log(message.embeds[0].color);
    if (message.embeds[0].color == 2406327) {
      const member = message.guild.members.cache.get(message.embeds[0].description.split(' ')[0].replace('<@', '').replace('>', ''));

      const usersDB = await client.pool.query(`SELECT * FROM users WHERE id = ${member.id}`);
      const userDB = usersDB.rows[0];

      await client.pool.query(`UPDATE users SET credits = ${userDB.credits + 0.5} WHERE id = ${member.id}`);
      message.channel.send(`Merci ${member.toString()} d'avoir bump le serveur. Voici \`0.5\` credit en récompense.`);
    }    
  }
};