export default {
  name: 'stagekeys_stats',
  title: 'Stage Keys Live - Métricas & Likes',
  type: 'document',
  fields: [
    {
      name: 'likesCount',
      title: 'Contador de Likes',
      type: 'number',
      initialValue: 142,
    },
    {
      name: 'testersCount',
      title: 'Contador de Evaluadores',
      type: 'number',
      initialValue: 28,
    },
    {
      name: 'updatedAt',
      title: 'Última actualización',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }
  ],
  preview: {
    select: {
      title: 'likesCount',
      subtitle: 'testersCount'
    },
    prepare({ title, subtitle }: any) {
      return {
        title: `Likes: ${title || 0}`,
        subtitle: `Testers: ${subtitle || 0}`
      };
    }
  }
};
