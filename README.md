# Ringgit Token Smart Contracts
Ringgit Token (ticker: MYRT) is a fiat stable coin to represent Indonesian Ringgit as ERC20-compatible token by one-to-one peg.

This smart contract has been audited and certified by [CertiK](https://certik.org/), for more info please scan the badge.
![](https://Ringgittoken.com/static/images/badge/certik.png)

## Contracts
### Governance
Governance folder contains 4 contracts, 
 - Wallet - MultiSigWallet.sol -> MultiSigWallet enables multiple admin governance to execute certain functions for the smart contract.
 - Wallet - MYRTWalletV1.sol -> Extends the MultiSigWallet contract to add an additional role, and to determine which function is being called.
 -  Wallet - MYRTWalletV2.sol -> Extends the IDRWallet contract to as a demo contract of ZeppelinOS upgradeability.
 - Blacklistable.sol -> A contract to enable admins to blacklist certain addresses from receiving or sending Ringgit Token.

### Lifecycle
Lifecycle folder contains 1 contract, 
 - Pausable.sol -> Pausable contract enables admins to pause the contract if it is needed.

### Math
Math folder contains 1 contract, 
 - SafeMath.sol -> SafeMath makes sure arithmetical operations to be safe and avoid overflow/underflow bug.

### Ownership
Ownership folder contains 1 contract, 
 - Ownable.sol -> Ownable contract helps to determine contract owner that may execute critical contract functions.

### Token
Token folder contains 3 contracts, 
 - IERC20.sol -> ERC20 Interface, contains required functions to be implemented so that the token is compatible with ERC20 standard.
 - ERC20RinggitTokenV1.sol -> Implementation of Ringgit Token as ERC20 token.
 - ERC20RinggitTokenV2.sol -> Extends ERC20RinggitTokenV1 as sample of ZeppelinOS upgradeability.

### Utils
Utils folder contains 1 contract, 
 - Address.sol -> Utility contract to determine whether if an address is a contract or not.

### ZOS
ZOS folder contains ZeppelinOS libraries.

## Copyright

Copyright (c) 2019 PT Ringgit Token Indonesia. All Rights Reserved
