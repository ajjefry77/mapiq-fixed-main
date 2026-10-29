import { reactive, type App } from 'vue';
import { logger, EV } from '../logger';

async function loadJson<T>(resourcePath: string): Promise<T> {
  const response = await fetch(resourcePath);

  if (!response.ok) {
    throw new Error(`Failed to load ${resourcePath}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function loadAppConfigs(app: App<Element>): Promise<void> {
  const configEntries: Array<[string, string]> = [
    ['dict', '/dictionary.json'],
    ['features', '/features.json'],
    ['mbtiles', '/mbtiles.json'],
  ];

  await Promise.allSettled(
    configEntries.map(([key, resourcePath]) =>
      loadJson<Record<string, unknown>>(resourcePath)
        .then((config) => app.provide(key, reactive(config)))
        .catch((error) => {
          logger.warn(EV.APP_CONFIG_LOAD_FAILED, { resource: resourcePath }, error);
        })
    )
  );
}
