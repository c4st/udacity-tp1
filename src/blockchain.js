/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

 const SHA256 = require('crypto-js/sha256');
 const BlockClass = require('./block.js');
 const bitcoinMessage = require('bitcoinjs-message');
 
 class Blockchain {
 
     /**
      * Constructor of the class, you will need to setup your chain array and the height
      * of your chain (the length of your chain array).
      * Also everytime you create a Blockchain class you will need to initialized the chain creating
      * the Genesis Block.
      * The methods in this class will always return a Promise to allow client applications or
      * other backends to call asynchronous functions.
      */
     constructor() {
         this.chain = [];
         this.height = -1;
         this.initializeChain();
         console.log("We are going to verify the initial chain!");
         this.validateChain();
     }
 
     /**
      * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
      * You should use the `addBlock(block)` to create the Genesis Block
      * Passing as a data `{data: 'Genesis Block'}`
      */
     async initializeChain() {
         if( this.height === -1){
             let block = new BlockClass.Block({data: 'Genesis Block'});
             await this._addBlock(block);
         }
     }
 
     /**
      * Utility method that return a Promise that will resolve with the height of the chain
      */
     getChainHeight() {
         return new Promise((resolve, reject) => {
             resolve(this.height);
         });
     }
 
     /**
      * _addBlock(block) will store a block in the chain
      * @param {*} block 
      * The method will return a Promise that will resolve with the block added
      * or reject if an error happen during the execution.
      * You will need to check for the height to assign the `previousBlockHash`,
      * assign the `timestamp` and the correct `height`...At the end you need to 
      * create the `block hash` and push the block into the chain array. Don't for get 
      * to update the `this.height`
      * Note: the symbol `_` in the method name indicates in the javascript convention 
      * that this method is a private method. 
      */
     _addBlock(block) {
         let self = this;
         return new Promise(async (resolve, reject) => {
            try {
                // set height
                block.height = self.height + 1;
                // set timestamp
                block.time = new Date().getTime().toString().slice(0,-3);
                if(self.height == -1) { // special genesis block case
                    block.previousBlockHash = null;
                } else {
                    // set previous block hash
                    block.previousBlockHash = self.chain[self.chain.length-1].hash;
                }
                // set current block hash
                block.hash = SHA256(JSON.stringify(block)).toString();
                // push block on to blockchain
                self.chain.push(block);
                // update blockchain height
                this.height += 1;
                resolve(block);
            } catch (error) {               
                Error(error);
            }     
            
            
         });
        
     }
 
     /**
      * The requestMessageOwnershipVerification(address) method
      * will allow you  to request a message that you will use to
      * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
      * This is the first step before submit your Block.
      * The method return a Promise that will resolve with the message to be signed
      * @param {*} address 
      */
     requestMessageOwnershipVerification(address) {
         return new Promise((resolve) => {
             // message format
             // <WALLET_ADDRESS>:${new Date().getTime().toString().slice(0,-3)}:starRegistry
             var message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
             console.log('requestMessageOwnership: ' + message);   
             resolve(message);
         });
         
     }
 
     /**
      * The submitStar(address, message, signature, star) method
      * will allow users to register a new Block with the star object
      * into the chain. This method will resolve with the Block added or
      * reject with an error.
      * Algorithm steps:
      * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
      * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
      * 3. Check if the time elapsed is less than 5 minutes
      * 4. Verify  the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
      * 5. Create the block and add it to the chain
      * 6. Resolve with the block added.
      * @param {*} address 
      * @param {*} message 
      * @param {*} signature 
      * @param {*} star 
      */
     submitStar(address, message, signature, star) {
         let self = this;
         return new Promise(async (resolve, reject) => {
             let messageTime = parseInt(message.split(':')[1]);//Get the time from the message sent as a parameter 
             let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));//Get the current time: `let currentTime
             let flagTimeElapsed = false;
             if((currentTime - messageTime) > 300){ //Check if the time elapsed is less than 5 minutes
                flagTimeElapsed = true; 
                reject("submitStar: more than five minutes have elapsed");
             }
             var isVerified = false;
             try {
                //Verify  the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
                isVerified = bitcoinMessage.verify(message, address, signature) ;
                console.log(isVerified);   
             } catch (error) {               
                Error(error);
             }
             
             //Create the block and add it to the chain
             let data = {address: address, message: message, signature: signature, star: star};
             let block = new BlockClass.Block(data);
             
             if(!isVerified || flagTimeElapsed == true) {
                 console.log('submitStar verification: ' + isVerified + ' time elapsed? ' + flagTimeElapsed);
                 reject(block);                 
                 return;
             }
             console.log('submitStar verification: ' + isVerified + ' adding block');
             await this._addBlock(block);
             //execute the validateChain() function every time a block is added
             var blockchain_valide_boo = this.validateChain();
             console.log('Validation de la blockchain après ajout étoile: ' + blockchain_valide_boo );
             //Resolve with the block added.
             resolve(block);
         });   
     }
 
     /**
      * This method will return a Promise that will resolve with the Block
      *  with the hash passed as a parameter.
      * Search on the chain array for the block that has the hash.
      * @param {*} hash 
      */
     getBlockByHash(hash) {
         let self = this;
         return new Promise((resolve, reject) => {
            let block = self.chain.find(p => p.hash == hash);
            if(block) {
                resolve(block);
            } else {
                resolve(null);
            }
         });
         
     }
 
     /**
      * This method will return a Promise that will resolve with the Block object 
      * with the height equal to the parameter `height`
      * @param {*} height 
      */
     getBlockByHeight(height) {
         let self = this;
         return new Promise((resolve, reject) => {
             let block = self.chain.filter(p => p.height === height)[0];
             if(block){
                 resolve(block);
             } else {
                 resolve(null);
             }
         });
     }
 
     /**
      * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
      * and are belongs to the owner with the wallet address passed as parameter.
      * Remember the star should be returned decoded.
      * @param {*} address 
      */
        getStarsByWalletAddress(address) {
            let self = this;
            let results = [];
            return new Promise((resolve, reject) => {            
                
                // Method derived from: https://knowledge.udacity.com/questions/282668
                self.chain.forEach(async(b) => {

                        let blockData = await b.getBData();
                        if (blockData.address === address) results.push(blockData);

                });         
                resolve(results);

            });

        }
 
     /**
      * This method will return a Promise that will resolve with the list of errors when validating the chain.
      * Steps to validate:
      * 1. You should validate each block using `validateBlock`
      * 2. Each Block should check the with the previousBlockHash
      */
     validateChain() {
         let self = this;
         let errorLog = [];
         const ChainIsValid = true;
        //Set initial genesis hash
        var previous_Block_Hash = 0;
         return new Promise(async (resolve, reject) => {
            self.chain.forEach(block => {

                if(block.height === 0){
                    previous_Block_Hash = block.hash;
                }                
           
                //You should validate each block using `validateBlock`
                //console.log("Resultat du validate: " , block.validate());
                var BlockIsValid = block.validate();
                if(BlockIsValid == false){
                    errorLog.push("<br><hr>Il y a une erreur sur le block " + block.height); 
                    ChainIsValid = false;                                      
                }/*else{
                     errorLog.push("<br><hr>Il n'y a pas d'erreurs pour le bloc " + block.height + " avec le hash # " + block.hash);                  
                }*/
                
                //Each Block should check the with the previousBlockHash
               // console.log(block.previousBlockHash , previous_Block_Hash);               
                if( block.height === 0 ){
                   // errorLog.push("<br>Genesis Block hash = " + block.hash );
                }else if(block.previousBlockHash == previous_Block_Hash){
                    //errorLog.push("<br>Previous block hash is: " + previous_Block_Hash + " block.previoushash= " + block.previousBlockHash);
                }else{
                    errorLog.push("<br>Les hash ne coresspondent pas, la chaine est brisé, previous bloc hash: " + previous_Block_Hash + "  présent hash = " + block.previousBlockHash );
                    ChainIsValid = false;
                }
                
                previous_Block_Hash = block.hash; 
                
            });                    
            if(ChainIsValid == true){
                resolve(true);
            }else{
                resolve(errorLog);
            }
            
         });
                   
     }
 
 }
 
 module.exports.Blockchain = Blockchain;   