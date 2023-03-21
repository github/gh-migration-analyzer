#!/usr/bin/env node

/*
 * A command-line (cli) utility tool to help customers migrating
 * repositories to GitHub plan for and size their migration.
 */
import * as api from "../api/azureDevOps.js";
import * as gitHubAPI from "../api/gitHub.js";
import prompts from "prompts";

/**
 * Prompt for Personal Access Token
 *
 * @param {string} versionControl the name of the version control system for the migration
 */
export const promptForToken = (versionControl) => {
  return [
    {
      type: "text",
      name: "PAT",
      message: `Enter PAT for ${versionControl}`,
    },
  ];
};

/**
 * Fetching all data in organization provided after successful authentication
 *
 * @param {object} credentials the credentials for chosen version control
 */
export const azureDevOpController = async (credentials) => {
  // User provides specific project with organization
  if (credentials.organization && credentials.project) {
    // Fetch only project
    await api.getRepositoryInProject(credentials, true);
  } else {
    // Start at the very top of the tree
    // Fetch every project in organization
    // Organization -> Project -> Repository -> Pull Requests
    await api.authorization(credentials);
    await api.getAllProjects(credentials);
  }
};

/**
 * Fetching all data in organization provided after successful authentication
 *
 * @param {object} credentials the credential for chosen version control
 */
export const gitHubParser = async (credentials) => {
  // Check if user is authorized to given organization
  // Start at the very top of the tree
  // Organization -> Project -> Repository -> Pull Requests
  await gitHubAPI.authorization(credentials);
};

/**
 * Error checking for user input
 *
 * @param {object} options the information needed for the migration
 * @param {string} service the name of the desired version control service
 */
export const checkUserInput = (options, service) => {
  if (!options.organization) {
    if (service === "AzureDevOps" && options.project) {
      console.log(
        "error: provide organization for given project [usage --organization <org>]"
      );
    } else {
      console.log("error: no organization [usage --organization <org>]");
    }
    process.exit();
  }
};

/**
 * Sets the PAT if one was provided, otherwise prompts the user for one
 *
 * @param {string} PAT the Personal Access Token for the user
 * @param {object} options the information needed for the migration
 * @param {string} service the name of the desired version control service
 */
export const handleToken = async (PAT, options, service) => {
  if (!options.token) {
    if (PAT) return PAT;
    else {
      // If PAT not in .env AND no token provided as argument
      // Prompt user to enter PAT
      const input = await prompts(promptForToken(service));
      return input.PAT;
    }
  }
};

/**
 * Generalizes execution of command by User
 *
 * @param {string} PAT the personal access token for the user
 * @param {Function} callback the callback function for the desired version control
 * @param {object} options the information needed for the migration
 * @param {string} service the name of the desired version control service
 */
export const commandController = async (PAT, callback, options, service) => {
  checkUserInput(options, service);
  if (!options.token) options.token = await handleToken(PAT, options, service);
  callback(options);
};
