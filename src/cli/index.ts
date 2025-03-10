#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import * as glob from 'glob';

const program = new Command();

// Define the version of the CLI
program
  .version('0.1.0')
  .description('OnchainKit SDK - Add components and utilities to your project');

// Command to add a component
program
  .command('add <component>')
  .description('Add a component to your project')
  .option('-d, --dir <directory>', 'The destination directory to copy the component to', './components')
  .action(async (component: string, options: { dir: string }) => {
    try {
      // Process special case for connect-wallet
      if (component === 'connect-wallet') {
        console.log(chalk.blue('Installing connect-wallet components and dependencies...'));
        
        // Path to the root directory of the user's project
        const projectRoot = process.cwd();
        
        // The directories to create in the user's project
        const userComponentsDir = path.join(projectRoot, 'components');
        const userLibDir = path.join(projectRoot, 'lib');
        const userUtilsDir = path.join(projectRoot, 'utils');
        const userProviderDir = path.join(projectRoot, 'provider');
        
        // Ensure the directories exist
        fs.ensureDirSync(userComponentsDir);
        fs.ensureDirSync(userLibDir);
        fs.ensureDirSync(userUtilsDir);
        fs.ensureDirSync(userProviderDir);
        
        // Check if the connect-wallet directories exist in the user's project
        const userConnectWalletComponentDir = path.join(userComponentsDir, 'connect-wallet');
        const userConnectWalletLibDir = path.join(userLibDir, 'connect-wallet');
        const userConnectWalletUtilsDir = path.join(userUtilsDir, 'connect-wallet');
        
        // Check and ask the user before overwriting
        if (fs.existsSync(userConnectWalletComponentDir) || 
            fs.existsSync(userConnectWalletLibDir) || 
            fs.existsSync(userConnectWalletUtilsDir) || 
            fs.existsSync(path.join(userProviderDir, 'wallet-provider.tsx'))) {
          
          const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: 'Some connect-wallet files already exist in your project. Do you want to overwrite them?',
            initial: false
          });

          if (!overwrite) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
          }
        }
        
        // Path to the src directory in the SDK
        const sdkSrcDir = path.join(__dirname, '../../src');
        
        // Copy the components/connect-wallet files
        const srcComponentsDir = path.join(sdkSrcDir, 'components/connect-wallet');
        if (fs.existsSync(srcComponentsDir)) {
          fs.copySync(srcComponentsDir, userConnectWalletComponentDir);
          console.log(chalk.green('Added connect-wallet components to ./components/connect-wallet'));
        }
        
        // Copy the lib/connect-wallet files
        const srcLibDir = path.join(sdkSrcDir, 'lib/connect-wallet');
        if (fs.existsSync(srcLibDir)) {
          fs.copySync(srcLibDir, userConnectWalletLibDir);
          console.log(chalk.green('Added connect-wallet utils to ./lib/connect-wallet'));
        }
        
        // Copy the utils/connect-wallet files
        const srcUtilsDir = path.join(sdkSrcDir, 'utils/connect-wallet');
        if (fs.existsSync(srcUtilsDir)) {
          fs.copySync(srcUtilsDir, userConnectWalletUtilsDir);
          console.log(chalk.green('Added connect-wallet utils to ./utils/connect-wallet'));
        }
        
        // Copy the provider/wallet-provider.tsx file
        const srcProviderFile = path.join(sdkSrcDir, 'provider/wallet-provider.tsx');
        if (fs.existsSync(srcProviderFile)) {
          fs.copySync(srcProviderFile, path.join(userProviderDir, 'wallet-provider.tsx'));
          console.log(chalk.green('Added wallet-provider.tsx to ./provider/'));
        }
        
        console.log(chalk.green('Successfully installed connect-wallet components and dependencies!'));
        console.log(chalk.yellow('Note: You need to install the following dependencies:'));
        console.log(chalk.yellow('npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui class-variance-authority clsx'));
        
        return;
      }
      
      // Process the normal case for other components
      const componentPath = path.join(__dirname, '../components', component);
      const targetDir = path.resolve(process.cwd(), options.dir);

      // Check if the component exists
      if (!fs.existsSync(componentPath)) {
        console.error(chalk.red(`Component "${component}" not found.`));
        console.log(chalk.yellow('Available components:'));
        
        // List all available components
        const availableComponents = glob.sync('*', { cwd: path.join(__dirname, '../components') });
        availableComponents.forEach(comp => {
          console.log(chalk.green(`- ${comp}`));
        });
        
        return;
      }

      // Check if the destination directory exists
      if (!fs.existsSync(targetDir)) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `The directory "${options.dir}" does not exist. Do you want to create it?`,
          initial: true
        });

        if (confirm) {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(chalk.green(`The directory "${options.dir}" has been created.`));
        } else {
          console.log(chalk.yellow('The operation has been cancelled.'));
          return;
        }
      }

      // Check if the component already exists in the destination directory
      const targetPath = path.join(targetDir, component);
      if (fs.existsSync(targetPath)) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Component "${component}" already exists. Do you want to overwrite it?`,
          initial: false
        });

        if (!overwrite) {
          console.log(chalk.yellow('The operation has been cancelled.'));
          return;
        }
      }

      // Copy component to the destination directory
      fs.copySync(componentPath, targetPath);
      console.log(chalk.green(`The component "${component}" has been added to "${options.dir}".`));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  });

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
  });

// Command to add a utility
program
  .command('add-util <utility>')
  .description('Add a utility to your project')
  .option('-d, --dir <directory>', 'The destination directory to copy the utility to', './utils')
  .action(async (utility: string, options: { dir: string }) => {
    try {
      const utilityPath = path.join(__dirname, '../utils', utility);
      const targetDir = path.resolve(process.cwd(), options.dir);

      // Check if the utility exists
      if (!fs.existsSync(utilityPath)) {
        console.error(chalk.red(`Utility "${utility}" not found.`));
        console.log(chalk.yellow('Available utilities:'));
        
        // List all available utilities
        const availableUtils = glob.sync('*', { cwd: path.join(__dirname, '../utils') });
        availableUtils.forEach(util => {
          console.log(chalk.green(`- ${util}`));
        });
        
        return;
      }

      // Check if the destination directory exists
      if (!fs.existsSync(targetDir)) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `The directory "${options.dir}" does not exist. Do you want to create it?`,
          initial: true
        });

        if (confirm) {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(chalk.green(`The directory "${options.dir}" has been created.`));
        } else {
          console.log(chalk.yellow('The operation has been cancelled.'));
          return;
        }
      }

      // Check if the utility already exists in the destination directory
      const targetPath = path.join(targetDir, utility);
      if (fs.existsSync(targetPath)) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Utility "${utility}" already exists. Do you want to overwrite it?`,
          initial: false
        });

        if (!overwrite) {
          console.log(chalk.yellow('The operation has been cancelled.'));
          return;
        }
      }

      // Copy utility to the destination directory
      fs.copySync(utilityPath, targetPath);
      console.log(chalk.green(`The utility "${utility}" has been added to "${options.dir}".`));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  });

// Command to remove a component
program
  .command('remove <component>')
  .description('Remove a component and related files from your project')
  .action(async (component: string) => {
    try {
      // Handle the special case for connect-wallet
      if (component === 'connect-wallet') {
        console.log(chalk.blue('Removing connect-wallet component and related files...'));
        
        // Path to the root directory of the user's project
        const projectRoot = process.cwd();
        
        // The paths to the directories to remove
        const connectWalletComponentDir = path.join(projectRoot, 'components/connect-wallet');
        const connectWalletLibDir = path.join(projectRoot, 'lib/connect-wallet');
        const connectWalletUtilsDir = path.join(projectRoot, 'utils/connect-wallet');
        const walletProviderFile = path.join(projectRoot, 'provider/wallet-provider.tsx');
        
        // Check if the directories/files exist
        const filesToRemove = [];
        if (fs.existsSync(connectWalletComponentDir)) filesToRemove.push(connectWalletComponentDir);
        if (fs.existsSync(connectWalletLibDir)) filesToRemove.push(connectWalletLibDir);
        if (fs.existsSync(connectWalletUtilsDir)) filesToRemove.push(connectWalletUtilsDir);
        if (fs.existsSync(walletProviderFile)) filesToRemove.push(walletProviderFile);
        
        if (filesToRemove.length === 0) {
          console.log(chalk.yellow('No connect-wallet files found in your project.'));
          return;
        }
        
        // Confirm with the user before deleting
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete the connect-wallet files?',
          initial: false
        });
        
        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled.'));
          return;
        }
        
        // Proceed with deletion
        console.log(chalk.yellow('Deleting the following files:'));
        for (const file of filesToRemove) {
          console.log(chalk.yellow(`- ${file}`));
          fs.removeSync(file);
        }
        
        console.log(chalk.green('Successfully removed connect-wallet files!'));
        return;
      }
      
      // Handle the normal case for other components
      const componentDir = path.join(process.cwd(), 'components', component);
      
      if (!fs.existsSync(componentDir)) {
        console.log(chalk.yellow(`Component "${component}" does not exist in your project.`));
        return;
      }
      
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete the component "${component}"?`,
        initial: false
      });
      
      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
      
      fs.removeSync(componentDir);
      console.log(chalk.green(`Successfully removed component "${component}"!`));
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
    }
  });

// Start the CLI
program.parse(process.argv); 