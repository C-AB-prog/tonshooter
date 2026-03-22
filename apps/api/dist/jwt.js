import jwt from "jsonwebtoken";
import { config } from "./config.js";
export function signJwt(payload) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: "30d" });
}
export function verifyJwt(token) {
    return jwt.verify(token, config.jwtSecret);
}
