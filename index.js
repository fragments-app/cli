#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shell = require("shelljs");
const fs = require('fs')
const { unique } = require('./utils');


const fragmentsRepo = 'https://github.com/fragments-app/fragments.git';
const tempPath = 'fragmets_tmp';
const repoDir = 'fragments';
const cmps_dir = 'fragments/src/components/';

const init = () => {
  console.log(
    chalk.cyan.bold(
      figlet.textSync("F r a g m e n t s ", {
        font: "Doom",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  );
  console.log(chalk.white('----------------------------------------------------------------------'))
  console.log(chalk.bgCyan.hidden('  Upload your components to our library and add them to your project  '))
  console.log(chalk.bgCyan.white.bold('  Upload your components to our library and add them to your project  '))
  console.log(chalk.bgCyan.hidden('  Upload your components to our library and add them to your project  '))
  console.log(chalk.white('----------------------------------------------------------------------'))
  
};

const getFolders = async(path, excludeList) => {
  const dirs = fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
  merged = [...dirs, ...excludeList];
  return unique(merged);
}

const askQuestions = async() => {

  const folders = await getFolders('./', ['.git', 'node_modules']);
  console.log(folders)
  
  const questions = [
    {
      name: "PATH",
      type: "checkbox",
      message: "Enter the path to the component folder",
      choices: folders
    }
  ];
  return inquirer.prompt(questions);
};

const gitQuestion = () => {
  const questions = [
    {
      type: "list",
      name: "GIT",
      message: "This is the component you like to upload to the App?",
      choices: ["Yes", "No"],
      filter: function(val) {
        return val == 'Yes' ? true : false;
      }
    }
  ];
  return inquirer.prompt(questions);
};


const gitClone = () => {
    shell.exec(`
            git init 
            git clone ${fragmentsRepo}
            `
        );
}
const deleteTmp = async() => {
    console.log(`deleting... ./${tempPath}/*` )
    await shell.cd('../');
    await shell.exec('pwd');
    await shell.rm('-rf', `${tempPath}`);
}

const gitAdd = async(path) => {
  
    shell.mkdir(tempPath);
    shell.chmod('770', tempPath);
    shell.cd(tempPath);

    if (shell.which('git')) {
        
        await gitClone();
        
        await shell.cp('-R', `../${path}`, cmps_dir);

        await shell.cd(repoDir);
        
        await shell.exec(`
        git add -A
        git commit -m 'adding new component'
        `)
        
        await console.log(
            chalk.green(
                shell.exec('git status')
            )
        );
    
    } else {
        console.log(chalk.bgRed.white(' Sorry, this script requires git '));
        shell.exit(1);
    }
}

const pushToApp = async(response) => {
    console.log(response)
    if(response) {
        await shell.exec(`
            git pull
            git push -u origin master
            git status
            `
        );
    }
}

const run = async () => {
    // show script introduction
    init();

    // ask questions
    const answers = await askQuestions();
    const { PATH } = answers;

    // 
    await gitAdd(PATH);

    const gitAnswer = await gitQuestion();
    await pushToApp(gitAnswer.GIT);

    await shell.cd('..');
        
    deleteTmp();

    // show success message
    //   success(filePath);
};

run();