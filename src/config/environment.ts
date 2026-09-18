export const devEnv = typeof __DEV__ !== `undefined` ? __DEV__ : process.env.NODE_ENV === `development`;
export const dev = () => devEnv;
