#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import * as glob from 'glob';
import { FeatureConfig } from './types';

const program = new Command();

// Define the version of the CLI
program
  .version('0.1.0')
  .description('OnchainKit SDK - Add components and utilities to your project');

// Function to load feature configuration
async function loadFeatureConfig(featureName: string): Promise<FeatureConfig> {
  const configPath = path.join(__dirname, '../features', `${featureName}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Feature "${featureName}" not found.`);
  }
  return fs.readJSON(configPath);
}

// Command to add a component
program
  .command('add <feature>')
  .description('Add a feature to your project')
  .action(async (feature: string) => {
    try {
      // Load feature configuration
      const config: FeatureConfig = await loadFeatureConfig(feature);
      console.log(chalk.blue(`Installing ${config.name} components and dependencies...`));
      
      // Path to the root directory of the user's project
      const projectRoot = process.cwd();
      const sdkSrcDir = path.join(__dirname, '../../src');
      
      // Process each file in the feature configuration
      for (const file of config.files) {
        const srcPath = path.join(sdkSrcDir, file.source);
        const targetPath = path.join(projectRoot, file.target);
        
        // Ensure target directory exists
        fs.ensureDirSync(path.dirname(targetPath));
        
        // Check if files already exist
        if (fs.existsSync(targetPath)) {
          const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: `Some ${config.name} files already exist in your project. Do you want to overwrite them?`,
            initial: false
          });

          if (!overwrite) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
          }
        }
        
        // Copy files
        if (fs.existsSync(srcPath)) {
          if (fs.statSync(srcPath).isDirectory()) {
            fs.copySync(srcPath, targetPath);
          } else {
            fs.copySync(srcPath, targetPath);
          }
          console.log(chalk.green(`Added ${file.target}`));
        }
      }
      
      // Display dependencies message
      if (config.dependencies && config.dependencies.length > 0) {
        console.log(chalk.yellow('\nNote: You need to install the following dependencies:'));
        console.log(chalk.yellow(`npm install ${config.dependencies.join(' ')}`));
      }
      
      console.log(chalk.green(`\nSuccessfully installed ${config.name}!`));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  }
);

// Command to list all available components and utilities
program
  .command('list')
  .description('List all available components and utilities')
  .option('-c, --components', 'List only components')
  .option('-u, --utils', 'List only utilities')
  .action((options) => {
    try {
      const showComponents = options.components || (!options.components && !options.utils);
      const showUtils = options.utils || (!options.components && !options.utils);
      
      // List components
      if (showComponents) {
        const componentsPath = path.join(__dirname, '../components');
        const components = glob.sync('*', { cwd: componentsPath });

        console.log(chalk.green('Available components:'));
        if (components.length === 0) {
          console.log(chalk.yellow('  No components available.'));
        } else {
          components.forEach(component => {
            console.log(chalk.cyan(`  - ${component}`));
          });
        }
      }
      
      // List utilities
      if (showUtils) {
        const utilsPath = path.join(__dirname, '../utils');
        const utils = glob.sync('*', { cwd: utilsPath });

        console.log(chalk.green('\nAvailable utilities:'));
        if (utils.length === 0) {
          console.log(chalk.yellow('  No utilities available.'));
        } else {
          utils.forEach(util => {
            console.log(chalk.cyan(`  - ${util}`));
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  }
);

// Function to check and remove empty directories recursively if they are part of the feature
async function removeEmptyDirectories(dirPath: string, featureConfig: FeatureConfig): Promise<void> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) return;

    // Check if this directory is part of the feature configuration
    const isFeatureDirectory = featureConfig.files.some(file => {
      const targetDir = path.dirname(file.target);
      return dirPath.includes(targetDir);
    });

    if (!isFeatureDirectory) return;

    let files = await fs.readdir(dirPath);
    
    // Process subdirectories first
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await removeEmptyDirectories(fullPath, featureConfig);
        }
      } catch (error) {
        // Ignore errors for individual files/directories
      }
    }

    // Check again after processing subdirectories
    files = await fs.readdir(dirPath);
    if (files.length === 0) {
      await fs.remove(dirPath);
      console.log(chalk.yellow(`Removed empty directory: ${dirPath}`));
    }
  } catch (error) {
    // Ignore errors when checking directories
  }
}

// Command to remove a component
program
  .command('remove <feature>')
  .description('Remove a feature and related files from your project')
  .action(async (feature: string) => {
    try {
      // Load feature configuration
      const config = await loadFeatureConfig(feature);
      console.log(chalk.blue(`Removing ${config.name} files...`));
      
      // Path to the root directory of the user's project
      const projectRoot = process.cwd();
      
      // Check if any of the feature files exist
      interface FeatureFile {
        source: string;
        target: string;
      }

      const filesToRemove = config.files
        .map((file: FeatureFile) => path.join(projectRoot, file.target))
        .filter((filePath: string) => {
          try {
            return fs.existsSync(filePath) || fs.existsSync(path.dirname(filePath));
          } catch {
            return false;
          }
        });
      
      if (filesToRemove.length === 0) {
        console.log(chalk.yellow(`No ${config.name} files found in your project.`));
        return;
      }
      
      // Confirm with the user before deleting
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete the ${config.name} files?`,
        initial: false
      });
      
      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
      
      // Proceed with deletion
      console.log(chalk.yellow('Deleting the following files:'));
      for (const file of filesToRemove) {
        try {
          console.log(chalk.yellow(`- ${file}`));
          fs.removeSync(file);
          
          // Clean up empty parent directories that are part of the feature
          let currentDir = path.dirname(file);
          while (currentDir !== projectRoot) {
            await removeEmptyDirectories(currentDir, config);
            currentDir = path.dirname(currentDir);
          }
        } catch (error) {
          console.log(chalk.yellow(`Failed to remove ${path.relative(projectRoot, file)}`));
        }
      }
      
      console.log(chalk.green(`Successfully removed ${config.name} files!`));
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  });

// Start the CLI
program.parse(process.argv);