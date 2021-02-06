require("openzeppelin-test-helpers");
const { shouldBehaveLikeOwnable } = require("./Ownable.behavior");

const TestUtils = require("./TestUtils");
const ERC20RinggitToken = artifacts.require("ERC20RinggitToken");

contract("ERC20RinggitToken Ownable", function([owner, ...otherAccounts]) {
  beforeEach(async function() {
    proxyAdmin = await TestUtils.createProxyAdmin(owner);
    tokenImplementation = await TestUtils.createImplementation(
      ERC20RinggitToken
    );
    tokenProxy = await TestUtils.createProxy(
      tokenImplementation.address,
      proxyAdmin.address,
      []
    );

    this.ownable = await ERC20RinggitToken.at(tokenProxy.address);
    await TestUtils.initializeTokenProxy(this.ownable);
  });

  shouldBehaveLikeOwnable(owner, otherAccounts);
});
