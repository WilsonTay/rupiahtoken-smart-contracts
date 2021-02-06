const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const MYRTWalletImplementation = artifacts.require("./governance/wallet/MYRTWallet");

module.exports = function(deployer, network, accounts) {
    console.log("deploying wallet implementation contract...");
    deployer.deploy(MYRTWalletImplementation).
    	then(async function () {
    		switch(network) {
                case 'development':
    				DeployedAddresses.dev.walletImplementationV1 = (await MYRTWalletImplementation.deployed()).address;
    				break;
    			case 'ropsten':
    				DeployedAddresses.ropsten.walletImplementationV1 = (await MYRTWalletImplementation.deployed()).address;
                    break;
                case 'rinkeby':    				
                	DeployedAddresses.rinkeby.walletImplementationV1 = (await MYRTWalletImplementation.deployed()).address;
                    break;
                case 'mainnet':
                    DeployedAddresses.mainnet.walletImplementationV1 = (await MYRTWalletImplementation.deployed()).address;
                    break;
                    case 'bnbtestnet':
                        DeployedAddresses.bnbtestnet.walletImplementationV1 = (await MYRTWalletImplementation.deployed()).address;
                        break;
    		}
    	});
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
};
