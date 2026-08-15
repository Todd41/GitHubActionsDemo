import { greet } from "./greet.js";

const name = process.argv[2];
console.log(greet(name, process.env.GREETING_SECRET));
