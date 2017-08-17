const inquirer = require('inquirer');
const moment = require('moment');
const spawn = require('child_process').spawn;
const Store = require('jfs');
const sendMsg = require('./send-message');

const CONST = require('./constants');
const DEFAULTS = CONST.DEFAULTS;
const DB_KEY = CONST.DB_KEY;

class App {
  constructor() {
    this.db = new Store('db.json', { pretty: true });
    this.currentStoredVals = this.db.allSync().config || {};
    this.checkAndWriteDefaults(DEFAULTS, this.currentStoredVals.config);

    this.baseQuestions = [
      {
        name: 'time',
        type: 'input',
        message: 'Please enter time when you want be leave the computer (as HH:mm).',
        default: this.currentStoredVals.time && moment(this.currentStoredVals.time).format('HH:mm')
      },
      {
        name: 'action',
        type: 'list',
        message: 'Please select an action to execute after the timeout.',
        choices: [
          'NONE',
          'LOCK',
          'SUSPEND',
          'SHUTDOWN'
        ],
        default: this.currentStoredVals.action || 'LOCK'
      },
      {
        name: 'message',
        type: 'string',
        message: 'Enter the message to be displayed or press enter to leave as is.',
        default: this.currentStoredVals.message
      }
    ];

    this.startPrompt();
  }

  startPrompt() {
    inquirer.prompt(this.baseQuestions)
      .then((result) => {
        this.configDone(result);
      });
  }

  configDone(result) {
    const timeMoment = this.parseTimeString(result.time);
    const dataToSave = Object.assign({}, result, { time: timeMoment });
    this.writeInputToDb(dataToSave);
    this.sendDoneMsg(timeMoment);
    this.startBackgroundProcess();
  }

  startBackgroundProcess() {
    spawn('node', ['background-process.js'], {
      detached: true
    });
  }

  checkAndWriteDefaults(DEFAULTS, currentCfg) {
    if (!currentCfg) {
      this.db.saveSync(DB_KEY, Object.assign({}, DEFAULTS));
    } else {
      this.db.saveSync(DB_KEY, Object.assign({}, DEFAULTS, currentCfg));
    }
  }

  parseTimeString(timeStr) {
    // also allow hours
    if (timeStr.length <= 2) {
      timeStr += ':00';
    }
    return moment(timeStr, 'H:m');
  }

  sendDoneMsg(timeMoment) {
    const now = moment();
    const timeDiff = this.getTimeDifference(now, timeMoment);
    const msg = `Timer set. You will be notified in ${timeDiff} at ${timeMoment.format('HH:mm')} o'clock.`;
    sendMsg(msg);
  }

  writeInputToDb(dataToSave) {
    this.db.saveSync(DB_KEY, Object.assign({}, this.currentStoredVals, dataToSave));
  }

  getTimeDifference(now, then) {
    return moment.duration(now.diff(then)).humanize();
  }
}

new App();
