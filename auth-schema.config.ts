
import { betterAuth } from "better-auth";

const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
});

export { auth };
export default auth;
