export default async function executeNginxActivationBoundary(options = {}) {
  const rendered = await options.render();
  const validation = await options.validate(rendered);
  if (!validation?.ok) return Object.freeze({ activated: false, ok: false, reloaded: false, validation });
  await options.activate(rendered);
  await options.reload();
  return Object.freeze({ activated: true, ok: true, reloaded: true, validation });
}
