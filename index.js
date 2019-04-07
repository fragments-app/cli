#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shell = require("shelljs");
const fs = require('fs')
const { unique } = require('./utils');

const initialPath = shell.pwd().stdout;
const fragmentsRepo = 'git@github.com:fragments-app/Fragments.git';
const repoFolder = '.fragments';
let libraryPath = '';
let tempPath = '';
let appDir = '';
let compsPath = '';

const init = async() => {
  await pathsConfig();
  
  let exceptionOccured = false;

  process.on('uncaughtException', function(err) {
      console.log('Caught exception: ' + err);
      exceptionOccured = true;
      process.exit();
  });

  process.on('exit', function(code) {
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

const pathsConfig = () => {
  shell.cd('~');

  libraryPath = shell.pwd().stdout;
  tempPath = `${libraryPath}/${repoFolder}`
  compsPath = `${tempPath}/Fragments/src/components`;
  appDir = `${tempPath}/Fragments/src`;

  shell.cd(initialPath);
}

const getFolders = async(path, excludeList) => {
  const dirs = fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });

  if(dirs.includes(excludeList[0]) || dirs.includes(excludeList[1]) ) {
    merged = [...dirs, ...excludeList];
    dirs = unique(merged);
  }

  return dirs;
}

const pathQuestion = async(requestion) => {
  const folders = await getFolders('./', ['.git', 'node_modules']);
  
  const questions = [
    {
      name: "PATH",
      type: "checkbox",
      message: requestion ? "Be sure you select one!" : "Enter the path to the component folder",
      choices: folders
    }
  ];
  return inquirer.prompt(questions);
};

const gitQuestion = () => {
  const questions = [
    {
      type: "list",
      name: "uploadCmp",
      message: "This is the component you like to upload to the App?",
      choices: ["Yes", "No"],
      filter: function(val) {
        return val == 'Yes' ? true : false;
      }
    }
  ];
  return inquirer.prompt(questions);
};

const componentValidation = (PATH) => {

  const exists = shell.find(`${compsPath}/${PATH}`).stdout;

  const questions = [
    {
      type: "list",
      name: "exists",
      message: `The Component ${chalk.bold.red(PATH)} already exists, do you want to Update it?`,
      choices: ["Sure, Go, Go, GO!", "Abort Mision!"],
      filter: function(val) {
        return val == 'Abort Mision!' ? false : true;
      }
    }
  ];
  return exists.length ? inquirer.prompt(questions) : '';
}

const alreadyCreated = (pathToFind) => {
  let path = pathToFind || tempPath;
  const exists = shell.find(path).stdout;
  return exists.length ? true : false;
}

const writeReadAccess = (accessTo) => {
  const grantAccessTo = accessTo || compsPath;

  shell.exec(`sudo chmod -R 777 ${grantAccessTo}`)
}

const gitClone = async () => {
  const gitAdded = await alreadyCreated(tempPath);
  
  shell.exec(`ssh-add ./settings/id_rsa_fragments`);

  if(!gitAdded) {
    await shell.mkdir(tempPath);
  }
  await shell.cd('~')
  await shell.cd(tempPath)
 
  if(gitAdded){
    
    console.log(chalk.bgYellow.grey.bold('  Geting latest...  '));
    await shell.exec(`
      sudo git pull
    `)
  } else {
    shell.exec(`
        sudo git clone ${fragmentsRepo}
        `
    );
  }
}

const deleteCmp = async(cmp) => {
  shell.cd(initialPath);

  console.log(`deleting... ./${tempPath}/*` )
  await shell.rm('-rf', `${compsPath}/${cmp}`);
}

const checkIfConfig = (cmpToAdd) => {
  const configFound = shell.find(`${initialPath}/${cmpToAdd}/fragment.json`).stdout;
  if(!configFound.length){
    console.log(chalk.red.bold('No fragment.json found in your component, plase add one!'));
    process.exit();
  }
}

const gitAdd = async(path) => {
  
    shell.cd(tempPath);

    if (shell.which('git')) {
        // clone repo to project
        await gitClone();
        
        // check if origin has fragment.json file
        checkIfConfig(path);

        // validate if cmp exists
        const validation = await componentValidation(path);
        if(validation.exists === false) process.exit();

        // copy selected component to cloned repo (fragments)
        await writeReadAccess(`${tempPath}`);
        
        console.log(chalk.red.bold(compsPath))
        await shell.exec(`sudo cp -r ${initialPath}/${path} ${compsPath}/`);

        // inject selected component to App.js in fragments 
        if(!validation) await injectComponent(path);
        
        console.log('injection success')

        shell.cd(`${tempPath}/Fragments`);
        shell.exec(`
          sudo git add -A
          sudo git commit -m 'adding new component'
        `)
    
    } else {
      console.log(chalk.bgRed.white(' Sorry, this script requires git '));
      shell.exit(1);
    }
}

const createTemplateToInject = (config) => {
    let template = `<${config.component.output} />`;
    config.component.props.forEach(val => {
      template = template.replace('/>', `${val.prop}="${val.default}" />`)
    });

    return template;
}

const injectComponent = async (cmpToAdd)  => {
  const configJsonPath = `${initialPath}/${cmpToAdd}/fragment.json`;
  const rawdata = await fs.readFileSync(configJsonPath);  
  const cmpConfig = await JSON.parse(rawdata);  

  // create componetn markup tp inject
  const template = await createTemplateToInject(cmpConfig);

  // inject componetn markup
  await writeReadAccess(`${appDir}/App.js`);
  const appJs = await fs.readFileSync(`${appDir}/App.js`);
  let appJsFile = appJs.toString();
  appJsFile = appJsFile.replace('<Fragments>',
    `<Fragments>\n
        ${template}
    `
  )

  // inject import component
  const cmpName = cmpConfig.component.output;
  appJsFile = appJsFile.replace('// import components',
    `// import components \nimport ${cmpName}  from './components/${cmpName}/${cmpName}';
    `
  )
  console.log(appJsFile)
  fs.writeFileSync(`${appDir}/App.js`, appJsFile);  

  console.log('finish')
  return true;
}

const pushToApp = async(response) => {

    shell.cd(`${tempPath}/Fragments`);

    if(response) {
        await shell.exec(`
            sudo git push -u origin master
            `
        );
    }
}

const pathQuestions = async(requestion) => {
  const answers = await pathQuestion(requestion);
  if(answers.PATH == '') {
    await pathQuestions(true);
  }

  return answers;
}

const run = async () => {
    // show script introduction
    init();

    // ask questions
    const answers = await pathQuestions(false);
  
    // Add to git
    await gitAdd(answers.PATH);
    
    const confirmUpload = await gitQuestion();
    if(!confirmUpload.uploadCmp) process.exit();

    await pushToApp(confirmUpload.uploadCmp);

    
};
 
run();