// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Retrieves the current message given an add-on event.
 * @param {Event} event - Add-on event
 * @return {GoogleAppsScript.Gmail.GmailMessage}
 */
function getCurrentMessage(event) {
  var accessToken = event.messageMetadata.accessToken;
  var messageId = event.messageMetadata.messageId;
  if (accessToken) {
      GmailApp.setCurrentMessageAccessToken(accessToken);
      if (messageId) {
          var message =  GmailApp.getMessageById(messageId);
          if (DEBUG) {
              console.info("from message: ",message.getFrom());
          }
          return message;
      } else {
        return null;
      }

  } else {
    return null;
  }

}



/**
 * Retrieve the list of all participants in a conversation.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} message - Gmail message to extract from
 * @param {string[]} opt_blacklist - Array of emails to exclude
 * @return {string[]} email addresses
 */
function extractRecipients(message, opt_blacklist) {
  var emails = collectEmails_(message);
  emails = normalizeEmails_(emails);
  emails = filterEmails_(emails);
  if (!_.isEmpty(opt_blacklist)) {
    emails = _.difference(emails, opt_blacklist);
  }
  return emails.sort();
}

/**
 * Collect all email addresses appearing in the to/cc/from list
 * of a message.
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} message - Gmail message to extract from
 * @return {string[]} email addresses
 */
function collectEmails_(message) {
  return _.union(
    splitRecipients_(message.getTo()),
    splitRecipients_(message.getCc()),
    splitRecipients_(message.getFrom())
  );
}

/**
 * Extracts all email addresses from a to/cc/from header
 *
 * @param {string} headerValue - Value of a to/cc/from header
 * @return {string[]} email addresses
 */
function splitRecipients_(headerValue) {
  var re = /\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}\b/gi;
  return headerValue.match(re);
}

/**
 * Filters a list of email addresses to remove obvious non-user accounts.
 * @param {string[]} emailAddresses
 * @return {string[]}
 */
function normalizeEmails_(emailAddresses) {
  var re = /(.*)\+.*@(.*)/;
  return _.map(emailAddresses, function(email) {
    return email.replace(re, "$1@$2");
  });
}

/**
 *  Tests for common email issues. Note that this is not a prefect regex but one that is used a lot in js email checking
 * @param {string} email
 * @return {boolean}
 */
function validateEmail(email) {
    var re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/;
    return re.test(String(email).toUpperCase());
}

/**
 * Filters a list of email addresses to remove obvious non-user accounts.
 * @param {string[]} emailAddresses
 * @return {string[]}
 */
function filterEmails_(emailAddresses) {
  var re = /(.*no-reply.*|.*noreply.*|.*@docs.google.com)/;
  return _.reject(emailAddresses, function(email) {
    return re.test(email);
  });
}


/**
 * return true if vacation auto response is set to ON, returns false otherwise
 * @return {boolean}
 */
function is_out_of_office_reply() {
    // noinspection JSUnresolvedVariable
    var GSettings = Gmail.Users.Settings;
    // noinspection JSUnresolvedFunction
    var vacation_settings = GSettings.getVacation('me');

    // noinspection JSUnresolvedVariable
    var vacation_response = vacation_settings.enableAutoReply;
    console.info('Dumping the vacation:',vacation_response);
    return vacation_response;
}
