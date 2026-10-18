// Existing progress-metric tests import Hackatime's module but never call it.
process.env.HACKATIME_API_TOKEN ??= 'test-only';
