module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ["prettier"],
  plugins: ["prettier"],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};
