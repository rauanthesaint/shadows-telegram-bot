const Customer = class { 
    #serialNumber;
    #name; 
    #username;
    #regDate
    #chatID;
    constructor(name, username, chatID) { 
        this.#name = name; 
        this.#username = '@' + username;
        this.#regDate = new Date();
        this.#serialNumber = this.#regDate.getTime();
        this.#chatID = chatID;
    }

    get getUser() { 
        return { 
            serialNumber: this.#serialNumber, 
            username: this.#username, 
            name: this.#name, 
            date: this.#regDate,
            chatID: this.#chatID,
        }
    }
}

export default Customer;