export default {
  name: 'stagekeys_tester',
  title: 'Stage Keys Live - Beta Testers',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Correo de Google (Gmail)',
      type: 'string',
      validation: (Rule: any) => Rule.required().email(),
    },
    {
      name: 'device',
      title: 'Dispositivo / Tablet Android',
      type: 'string',
    },
    {
      name: 'midiController',
      title: 'Controlador MIDI que usará',
      type: 'string',
    },
    {
      name: 'notes',
      title: 'Notas o comentarios',
      type: 'text',
    },
    {
      name: 'createdAt',
      title: 'Fecha de Registro',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'device'
    }
  }
};
