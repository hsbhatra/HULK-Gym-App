import jwt from "jsonwebtoken";
import { JWT_CONFIG, COOKIE_CONFIG } from "../../utils/constants.js";
import ApiError from "../../utils/apiError.js";

export const generateAccessToken = (userId, role, sessionId) => {
  return jwt.sign(
    { sub: userId, role, sessionId },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
      algorithm: JWT_CONFIG.ALGORITHM,
    }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM],
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Access token has expired. Please refresh.");
    }
    if (err.name === "JsonWebTokenError") {
      throw ApiError.unauthorized("Invalid access token.");
    }
    throw ApiError.unauthorized("Token verification failed.");
  }
};

export const setRefreshTokenCookie = (res, rawRefreshToken) => {
  res.cookie(
    COOKIE_CONFIG.REFRESH_TOKEN.NAME,
    rawRefreshToken,
    {
      httpOnly: COOKIE_CONFIG.REFRESH_TOKEN.HTTP_ONLY,
      secure: COOKIE_CONFIG.REFRESH_TOKEN.SECURE,
      sameSite: COOKIE_CONFIG.REFRESH_TOKEN.SAME_SITE,
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN.MAX_AGE,
    }
  );
};

export const clearRefreshTokenCookie = (res) => {
  res.cookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, "", {
    httpOnly: true,
    secure: COOKIE_CONFIG.REFRESH_TOKEN.SECURE,
    sameSite: COOKIE_CONFIG.REFRESH_TOKEN.SAME_SITE,
    maxAge: 0,
  });
};

export const extractRefreshTokenFromCookie = (req) => {
  return req.cookies?.[COOKIE_CONFIG.REFRESH_TOKEN.NAME] || null;
};
