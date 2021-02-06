const {
  BN,
  constants,
  expectEvent,
  shouldFail
} = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;
const TestUtils = require("./TestUtils");
const ERC20RinggitToken = artifacts.require("ERC20RinggitToken");

contract("ERC20RinggitToken Pausable", function([
  owner,
  _,
  otherPauser,
  recipient,
  anotherAccount,
  ...otherAccounts
]) {
  const _name = "Ringgit Token";
  const _symbol = "MYRT";
  const _currency = "IDR";
  const _decimals = new BN(2);

  const initialSupply = new BN(100 * 10 ** _decimals);

  const pauser = owner;

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

    this.token = await ERC20RinggitToken.at(tokenProxy.address);
    await TestUtils.initializeTokenProxy(this.token);

    await this.token.mint(pauser, 100);
  });

  describe("pause", function() {
    describe("when the sender is the token pauser", function() {
      const from = pauser;

      describe("when the token is unpaused", function() {
        it("pauses the token", async function() {
          await this.token.pause({ from });
          (await this.token.paused()).should.equal(true);
        });

        it("emits a Pause event", async function() {
          const { logs } = await this.token.pause({ from });

          expectEvent.inLogs(logs, "Paused");
        });
      });
    });

    describe("when the sender is not the token pauser", function() {
      const from = anotherAccount;

      it("reverts", async function() {
        await shouldFail.reverting(this.token.pause({ from }));
      });
    });
  });

  describe("unpause", function() {
    describe("when the sender is the token pauser", function() {
      const from = pauser;

      describe("when the token is paused", function() {
        beforeEach(async function() {
          await this.token.pause({ from });
        });

        it("unpauses the token", async function() {
          await this.token.unpause({ from });
          (await this.token.paused()).should.equal(false);
        });

        it("emits an Unpause event", async function() {
          const { logs } = await this.token.unpause({ from });

          expectEvent.inLogs(logs, "Unpaused");
        });
      });
    });

    describe("when the sender is not the token pauser", function() {
      const from = anotherAccount;

      it("reverts", async function() {
        await shouldFail.reverting(this.token.unpause({ from }));
      });
    });
  });

  describe("pausable token", function() {
    const from = pauser;

    describe("paused", function() {
      it("is not paused by default", async function() {
        (await this.token.paused({ from })).should.equal(false);
      });

      it("is paused after being paused", async function() {
        await this.token.pause({ from });
        (await this.token.paused({ from })).should.equal(true);
      });

      it("is not paused after being paused and then unpaused", async function() {
        await this.token.pause({ from });
        await this.token.unpause({ from });
        (await this.token.paused()).should.equal(false);
      });
    });

    describe("transfer", function() {
      it("allows to transfer when unpaused", async function() {
        await this.token.transfer(recipient, initialSupply, { from: pauser });

        (await this.token.balanceOf(pauser)).should.be.bignumber.equal("0");
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(
          initialSupply
        );
      });

      it("allows to transfer when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.transfer(recipient, initialSupply, { from: pauser });

        (await this.token.balanceOf(pauser)).should.be.bignumber.equal("0");
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(
          initialSupply
        );
      });

      it("reverts when trying to transfer when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.transfer(recipient, initialSupply, { from: pauser })
        );
      });
    });

    describe("approve", function() {
      const allowance = new BN(40);

      it("allows to approve when unpaused", async function() {
        await this.token.approve(anotherAccount, allowance, { from: pauser });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance);
      });

      it("allows to approve when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.approve(anotherAccount, allowance, { from: pauser });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance);
      });

      it("reverts when trying to approve when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.approve(anotherAccount, allowance, { from: pauser })
        );
      });
    });

    describe("transfer from", function() {
      const allowance = new BN(40);

      beforeEach(async function() {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it("allows to transfer from when unpaused", async function() {
        await this.token.transferFrom(pauser, recipient, allowance, {
          from: anotherAccount
        });

        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(
          allowance
        );
        (await this.token.balanceOf(pauser)).should.be.bignumber.equal(
          initialSupply.sub(allowance)
        );
      });

      it("allows to transfer when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.transferFrom(pauser, recipient, allowance, {
          from: anotherAccount
        });

        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(
          allowance
        );
        (await this.token.balanceOf(pauser)).should.be.bignumber.equal(
          initialSupply.sub(allowance)
        );
      });

      it("reverts when trying to transfer from when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.transferFrom(pauser, recipient, allowance, {
            from: anotherAccount
          })
        );
      });
    });

    describe("decrease approval", function() {
      const allowance = new BN(40);
      const decrement = new BN(10);

      beforeEach(async function() {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it("allows to decrease approval when unpaused", async function() {
        await this.token.decreaseAllowance(anotherAccount, decrement, {
          from: pauser
        });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance.sub(decrement));
      });

      it("allows to decrease approval when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.decreaseAllowance(anotherAccount, decrement, {
          from: pauser
        });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance.sub(decrement));
      });

      it("reverts when trying to transfer when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.decreaseAllowance(anotherAccount, decrement, {
            from: pauser
          })
        );
      });
    });

    describe("increase approval", function() {
      const allowance = new BN(40);
      const increment = new BN(30);

      beforeEach(async function() {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it("allows to increase approval when unpaused", async function() {
        await this.token.increaseAllowance(anotherAccount, increment, {
          from: pauser
        });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance.add(increment));
      });

      it("allows to increase approval when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.increaseAllowance(anotherAccount, increment, {
          from: pauser
        });

        (await this.token.allowance(
          pauser,
          anotherAccount
        )).should.be.bignumber.equal(allowance.add(increment));
      });

      it("reverts when trying to increase approval when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.increaseAllowance(anotherAccount, increment, {
            from: pauser
          })
        );
      });
    });

    describe("blacklist", function() {
      it("allows to blacklist when unpaused", async function() {
        (await this.token.isBlacklisted(anotherAccount)).should.equal(false);
        await this.token.blacklist(anotherAccount, { from: owner });

        (await this.token.isBlacklisted(anotherAccount)).should.equal(true);
      });

      it("allows to blacklist when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        (await this.token.isBlacklisted(anotherAccount)).should.equal(false);
        await this.token.blacklist(anotherAccount, { from: owner });

        (await this.token.isBlacklisted(anotherAccount)).should.equal(true);
      });

      it("reverts when trying to blacklist when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.blacklist(anotherAccount, { from: owner })
        );
      });
    });

    describe("mint", function() {
      it("allows to mint when unpaused", async function() {
        await this.token.mint(anotherAccount, 10, { from: owner });

        (await this.token.balanceOf(anotherAccount)).should.be.bignumber.equal(
          "1000"
        );
      });

      it("allows to mint when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.mint(anotherAccount, 10, { from: owner });

        (await this.token.balanceOf(anotherAccount)).should.be.bignumber.equal(
          "1000"
        );
      });

      it("reverts when trying to mint when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(
          this.token.mint(anotherAccount, 10, { from: owner })
        );
      });
    });

    describe("burn", function() {
      it("allows to burn when unpaused", async function() {
        await this.token.burn(100, { from: owner });

        (await this.token.balanceOf(owner)).should.be.bignumber.equal("0");
      });

      it("allows to burn when paused and then unpaused", async function() {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.burn(100, { from: owner });

        (await this.token.balanceOf(owner)).should.be.bignumber.equal("0");
      });

      it("reverts when trying to burn when paused", async function() {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting(this.token.burn(100, { from: owner }));
      });
    });
  });
});
