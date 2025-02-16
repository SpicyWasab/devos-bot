module.exports = {
  description: 'Donne 1 credit à une personne ayant aidé.',
  type: 'CHAT_INPUT',
  permissions: [
    {
      type: 'ROLE',
      id: '786699378252578877',
      permission: true
    },
    {
      type: 'ROLE',
      id: '777210157305954374',
      permission: true
    },
    {
      type: 'ROLE',
      id: '759432774142394379',
      permission: true
    }
  ],
  options: [
    { name: 'membre', description: 'Choisissez un membre.', type: 'USER', required: true }
  ],
  async run({ client, interaction }) {
    const member = interaction.options.getMember('membre');

    if (!member) return interaction.error('Je ne trouve pas ce membre sur le serveur.');
    if (member.user.bot) return interaction.error('Vous ne pouvez pas donner des credits à un bot.');

    const usersDB = await client.pool.query(`SELECT * FROM users where id = ${member.id}`);
    const userDB = usersDB.rows[0];

    (!userDB) 
      ? await client.pool.query(`INSERT INTO users(id, credits, experience, level) VALUES (${member.id}, 1, 0, 0)`)
      : await client.pool.query(`UPDATE users SET credits =  ${userDB.credits + 1} WHERE id = ${member.id}`);

    interaction.success(`J'ai donné \`1\` credit à ${member.toString()}. Merci à lui pour sa participation.`);
  }
};