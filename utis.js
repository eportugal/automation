import { faker } from '@faker-js/faker';
let email;
let existingEmail;
let id = 1;
const hash = '0b7cab2c4e230c517099ffe1e9d5eecd';
const API_KEY = '42d0fa7e23msh1c9d9907b2f583bp19f37fjsnfafc30c69a76';
const API_HOST = 'privatix-temp-mail-v1.p.rapidapi.com';

export const extractConfirmationCode = (text) => {
  if (!text) {
    console.error('Incorrect text or empty');
    return null;
  }
  const match = text.match(/below:(\d{6})/);
  return match ? match[1] : null; 
};

export const apiRequest = () => {
    const apiUrl = `https://privatix-temp-mail-v1.p.rapidapi.com/request/mail/id/${hash}/`;
  
    return cy.request({
      method: 'GET',
      url: apiUrl,
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
      }
    });
};
  
export const getToken = (timeout, interval) => {
const startTime = Date.now();

const checkForToken = () => {
    return apiRequest().then((response) => {
    const data = response.body;

    if (!data || Object.keys(data).length === 0 || data.error === "There are no emails yet") {
        if (Date.now() - startTime > timeout) {
        throw new Error('Confirmation email did not arrive in time');
        }

        cy.wait(interval);
        return checkForToken();
    }

    const lastMail = Object.values(data).pop();
    if (!lastMail || !lastMail.mail_text) {
        return null;
    }

    const tokens = extractConfirmationCode(lastMail.mail_text);
    if (tokens) {
        return tokens;
    }

    cy.wait(interval);
    return checkForToken();
    });
};

return checkForToken();
};

export const clearInbox = async () => {
const getUrl = `https://${API_HOST}/request/mail/id/${hash}/`;

try {
    const response = await fetch(getUrl, {
    method: 'GET',
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
    }
    });
    const data = await response.json();

    if (data.error && data.error === "There are no emails yet") {
    console.log('No emails to clear.');
    return;
    }

    const emailList = Object.values(data);
    for (const email of emailList) {
    const mailId = email.mail_id;
    const deleteUrl = `https://${API_HOST}/request/delete/id/${mailId}/`;

    await fetch(deleteUrl, {
        method: 'GET',
        headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST,
        'Content-Type': 'application/json'
        }
    });
    }

    const checkEmpty = await fetch(getUrl, {
    method: 'GET',
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
    }
    });

    const checkData = await checkEmpty.json();

    if (checkData.error && checkData.error === "There are no emails yet") {
    console.log('All emails have been deleted.');
    }
} catch (error) {
    console.error('Error while clearing inbox:', error);
}
};
  
export const createEmailConsumer = () => {
    const randomEmail = faker.internet.email().toLowerCase();
    const emailID = randomEmail.split('@')[0];
    const emailBase = `emanoel+${emailID}@wearetaly.com`;
    email = emailBase;
    console.log(emailBase);

    const emailLogFilePath = './test-logs/app-auth/email-logs.json';

    cy.readFile(emailLogFilePath).then((existingLogs = {}) => {
        const existingIds = Object.keys(existingLogs).map(Number);
        id = existingIds.length ? Math.max(...existingIds) + 1 : 1;

        const emailLog = {
            [id]: {
                email: emailBase,
            },
        };

        cy.saveLogToFile(emailLogFilePath, emailLog);
    });
};

export const getExistingEmail = () => {
    const filePath = 'test-logs/app-auth/email-logs.json';

    return cy.readFile(filePath).then((data) => {
        if (!data || Object.keys(data).length === 0) {
            console.error('No emails found in:', filePath);
            return null;
        }
    
        const lastId = Object.keys(data).length; 

        if (!data[lastId]) {
            console.error('No email found for the last ID:', lastId);
            return null;
        }

        const existingEmail = data[lastId].email;
        console.log(`Existing email retrieved: ${existingEmail}`);
        return existingEmail;
    });
};

export { email, existingEmail };
