//collection of things that are useful , but not in the immediate code: for quick reference later



function reset_responses() {
    var settings = getSettingsForUser();
    settings.responses = [];
    updateSettingsForUser(settings);
    if (DEBUG) {
        console.info('reset responses',settings);
        Logger.log(settings);
    }
}

function log_settings() {
    var settings = getSettingsForUser();
    if (DEBUG) {
        console.info('reset responses',settings);
        Logger.log(settings);
    }
}

function init_trigger() {
  
    var triggerExists = false;
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === "timer_hook_call") {
            triggerExists = true;
        }
    }
  
  if(!triggerExists) {
      if (DEBUG) {
          console.info('creating one minute trigger');
          Logger.log('creating one minute trigger');
      }
    ScriptApp.newTrigger('timer_hook_call')
      .timeBased()
      .everyMinutes(1)
      .create();
  }
  
}