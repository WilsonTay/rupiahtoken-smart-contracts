var HDWalletProvider = require("truffle-hdwallet-provider");
var NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");
module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
   development: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*",
     gas: 6721975,
     gasPrice: 22000000000,
   },
   ropsten: {
    provider: function() {
      var wallet = new HDWalletProvider('1ef232a59c3c703ebb1aacb5d5e72c0c15b364aeb6039dac125fada2d3fa694a', 'https://ropsten.infura.io/v3/d0ee26e5d7064faeb9c5ed205c781531')
      var nonceTracker = new NonceTrackerSubprovider()
      wallet.engine._providers.unshift(nonceTracker)
      nonceTracker.setEngine(wallet.engine)
      return wallet;
    },
    network_id: 3,
    gas: 8000000,
    gasPrice: 22000000000,
    skipDryRun: true,
    from:"0xdF490FA4b71C2B651Df95827bAAB750dac665dD6"
  },
  bnbtestnet: {
    provider: function() {
      var wallet = new HDWalletProvider('1ef232a59c3c703ebb1aacb5d5e72c0c15b364aeb6039dac125fada2d3fa694a', 'https://data-seed-prebsc-1-s1.binance.org:8545/')
      var nonceTracker = new NonceTrackerSubprovider()
      wallet.engine._providers.unshift(nonceTracker)
      nonceTracker.setEngine(wallet.engine)
      return wallet;
    },
    network_id: 97,
    gas: 8000000,
    gasPrice: 22000000000,
    skipDryRun: true,
    from:"0xdF490FA4b71C2B651Df95827bAAB750dac665dD6"
  },
   test2: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*"
   },
   test: {
     provider: function() {
      var mnemonic = "spawn source fish token verb skull table direct world odor neutral adult"; // 12 word mnemonic
      return new HDWalletProvider(mnemonic, "https://data-seed-prebsc-1-s1.binance.org:8545/");
    },

    network_id: '*',
   }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  compilers: {
    solc: {
      version: "0.4.25",

      
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
   // etherscan: 'TF3V4C5D3KXTT3BG6HX7MTCEWKTJVDEBNW'
   etherscan:'CWN7NM14ZE4E3DZM6Q7ANN7M8XYHBZJP23'
  }
};
