#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shell = require("shelljs");
const fs = require('fs')
const { unique } = require('./utils');


const initialPath = shell.pwd().stdout;
const fragmentsRepo = 'https://github.com/fragments-app/fragments.git';
const tempPath = 'fragmets_tmp';
const repoDir = 'fragments';
const appDir = `${initialPath}/${tempPath}/${repoDir}/src`;
const cmps_dir = `${appDir}/components`;


const init = () => {

  let exceptionOccured = false;

  process.on('uncaughtException', function(err) {
      console.log('Caught exception: ' + err);
      exceptionOccured = true;
      process.exit();
  });

  process.on('exit', function(code) {
      deleteTmp();
      if(exceptionOccured) console.log('Exception occured');
      else console.log('Kill signal received');

  });


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

const pathQuestion = async() => {

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

    shell.cd('/');
    shell.cd(initialPath);

    console.log(`deleting... ./${tempPath}/*` )
    await shell.rm('-rf', `${tempPath}`);
}

const gitAdd = async(path) => {
  
    shell.mkdir(tempPath);
    shell.chmod('770', tempPath);
    shell.cd(tempPath);

    if (shell.which('git')) {
        // clone repo to project
        await gitClone();
        
        // copy selected component to cloned repo (fragments)
        await shell.cp('-R', `${initialPath}/${path}`, cmps_dir);

        // inject selected component to App.js in fragments 
        await injectComponent(path)
        
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

const injectComponent = async (cmpToAdd)  => {
  
  
  const rawdata = await fs.readFileSync(`${initialPath}/${cmpToAdd}/fragment.json`);  
  const cmpConfig = await JSON.parse(rawdata);  
  
  console.log('cmpConfig ...' , cmpConfig);

  const appJs = await fs.readFileSync(`${appDir}/App.js`);  
  let appJsFile = appJs.toString();
  appJsFile = appJsFile.replace('<Fragments>',
    `<Fragments>\n
        <${cmpConfig.component.output} />
    `
  )
  console.log(appJsFile)
  await fs.writeFileSync(`${appDir}/App.js`, appJsFile);  

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
    const answers = await pathQuestion();
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