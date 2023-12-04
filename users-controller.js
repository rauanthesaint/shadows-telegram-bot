import fs from 'fs';

const path = './users.txt';

export const addUser = (user) => {
    if (typeof user !== 'string') return;
    fs.appendFile(path, user + '\n', (err) => {
        if (err) {
            console.error('Error writing to the file:', err);
        } else {
            console.log('Data has been written to the file successfully.');
        }
    });
};

export const getUsers = () => {
    const fileContent = fs.readFileSync(path);

    const array = fileContent.toString('utf-8').split('\n');
    const uniqueArray = [...new Set(array)];
    return uniqueArray;
};
