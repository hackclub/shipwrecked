import { StatsD } from "node-statsd";
import { config } from "dotenv";

config(); // load environment variables
const environment = process.env.NODE_ENV
const graphite = process.env.GRAPHITE_HOST

if (graphite == null) {
    throw Error("Graphite is not initialized");
}

const options = {
  host: graphite,
  port: 8125,
  prefix: `${environment}.shipwrecked.`,
}
const metrics = StatsD(options);

export default metrics;