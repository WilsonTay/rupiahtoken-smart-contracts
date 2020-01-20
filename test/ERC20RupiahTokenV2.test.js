const {
  BN,
  constants,
  expectEvent,
  shouldFail
} = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;
const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");
const ERC20RupiahTokenV2 = artifacts.require("ERC20RupiahTokenV2");
const RupiahFeeCollector = artifacts.require('RupiahFeeCollector');
const config = require('./test_config');
const IDRTWallet = artifacts.require("IDRTWallet");
const IDRTWalletV2 = artifacts.require("IDRTWalletV2");
const ProxyAdmin = artifacts.require("ProxyAdmin");

contract("ERC20RupiahTokenV2", function([
    deployer,
    initialHolder,
    recipient,
    anotherAccount,
    toWhiteList1,
    toWhiteList2,
    fromWhiteList1,
    fromWhitelist2,
    normalAccount,
    ...otherAccounts
]) {
    const _name = "Rupiah Token";
    const _symbol = "IDRT";
    const _currency = "IDR";
    const _decimals = new BN(2);
    const initialSupply = new BN(100 * 10 ** _decimals);
    const sending = initialSupply * 0.5;
    let ratio = 1.5;
    let rupiahFeeCollector;

    beforeEach(async function() {
        proxyAdmin = await TestUtils.createProxyAdmin(deployer);
        tokenImplementation = await TestUtils.createImplementation(
            ERC20RupiahToken
        );
        tokenProxy = await TestUtils.createProxy(
            tokenImplementation.address,
            proxyAdmin.address,
            []
        );
        this.token = await ERC20RupiahToken.at(tokenProxy.address);
        await TestUtils.initializeTokenProxy(this.token);
        rupiahFeeCollector = await RupiahFeeCollector.new([fromWhiteList1, fromWhitelist2, deployer], [toWhiteList1, toWhiteList2, deployer], [fromWhitelist2, normalAccount], config.feeCollector.feeCollectorRatio, this.token.address, config.feeCollector.feeRatioNumerator, config.feeCollector.feeRatioDenominator);
        await this.token.setCollectorContract(rupiahFeeCollector.address);
        await this.token.mint(initialHolder, 100);


        this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address);
        tokenImplementationV2 = await TestUtils.createImplementation(
            ERC20RupiahTokenV2
        );
        await this.proxyAdmin.upgrade(
            tokenProxy.address,
            tokenImplementationV2.address,
            {from: deployer}
        );
        (await this.proxyAdmin.getProxyImplementation(
            tokenProxy.address
        )).should.equal(tokenImplementationV2.address);

        this.token = await ERC20RupiahTokenV2.at(tokenProxy.address);
    });

    it("has a name", async function() {
        const name = await this.token.name();
        name.should.be.equal(_name);
    });

    it("has a symbol", async function() {
        (await this.token.symbol()).should.be.equal(_symbol);
    });

    it("has an amount of decimals", async function() {
        (await this.token.decimals()).should.be.bignumber.equal(_decimals);
    });

    describe("upgrade", function() {
        describe("when upgraded", function() {
            it("should retain the previous storage", async function() {
                (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal("10000");
                (await this.token.totalSupply()).should.be.bignumber.equal("10000");
            });

            it("should not reenable initialize function", async function() {
                await shouldFail.reverting(
                    this.token.initialize(_name, _symbol, _currency, _decimals, {from: deployer})
                );
            });
        });
    });

    describe("when upgraded", function() {
        beforeEach(async function() {
            await this.proxyAdmin.upgradeAndCall(
                tokenProxy.address,
                tokenImplementationV2.address,
                "0x70a08231",
                {from: deployer}
            );
            this.token = await ERC20RupiahTokenV2.at(tokenProxy.address);
        });

        it("should retain the previous storage", async function() {
            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal("10000");
            (await this.token.totalSupply()).should.be.bignumber.equal("10000");
        });

        it("should not reenable initialize function", async function() {
            await shouldFail.reverting(
                this.token.initialize(_name, _symbol, _currency, _decimals, {from: deployer})
            );
        });
    });

    describe("total supply", function() {
        it("returns the total amount of tokens", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal(initialSupply);
        });
    });

    describe("balanceOf", function() {
        describe("when the requested account has no tokens", function() {
            it("returns zero", async function() {
                (await this.token.balanceOf(anotherAccount)).should.be.bignumber.equal("0");
            });
        });

        describe("when the requested account has some tokens", function() {
            it("returns the total amount of tokens", async function() {
                (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(initialSupply);
            });
        });
    });

    describe("transfer", function() {
        describe("when the recipient is not the zero address", function() {
            const to = recipient;

            describe("when the sender does not have enough balance", function() {
                const amount = initialSupply.addn(1);

                it("reverts", async function() {
                await shouldFail.reverting(
                    this.token.transfer(to, amount, {from: initialHolder})
                );
                });
            });

            describe("when the sender has enough balance", function() {
                const amount = sending;
                const fee = parseInt(sending * ratio / 100);

                it("transfers the requested amount", async function() {
                    const initBalance = await this.token.balanceOf(initialHolder);
                    await this.token.transfer(to, amount, {from:initialHolder});
                    (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(
                        (initBalance - fee - amount).toString()
                    );

                    (await this.token.balanceOf(to)).should.be.bignumber.equal(amount.toString());
                });

                it("emits a transfer event", async function() {
                    const { logs } = await this.token.transfer(to, amount, {from: initialHolder});

                    expectEvent.inLogs([logs.pop()], "Transfer", {
                        from: initialHolder,
                        to: to,
                        value: amount.toString()
                    });
                });
            });
            
            describe("about minimum token value", function() {
                const min = 100;
                const amount = sending+min;
                const fee = parseInt(amount * ratio / 100);
                const to = recipient;
        
                beforeEach(async function() {
                    await this.token.setMinimumTransfer(min);
                });
        
                afterEach(async function() {
                    await this.token.setMinimumTransfer(0);
                });
        
                it('checks minimum value', async function() {
                    const minimum = await this.token.getMinimumTransfer();
                    minimum.should.be.bignumber.equal(min.toString());
                });
        
                it("transfers much more money than minimum", async function() {
                    const initBalance = await this.token.balanceOf(initialHolder);
                    await this.token.transfer(to, amount, {from:initialHolder});
                    (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(
                        (initBalance - fee - amount).toString()
                    );
            
                    (await this.token.balanceOf(to)).should.be.bignumber.equal(amount.toString());
                });
        
                it("transfers less than minimum", async function() {
                    const amount = min - 1;
                    await shouldFail.reverting(
                        this.token.transfer(to, amount, {from:initialHolder})
                    );
                });
            });
        });

        describe("when the recipient is the zero address", function() {
            const to = ZERO_ADDRESS;

            it("reverts", async function() {
                await shouldFail.reverting(
                    this.token.transfer(to, initialSupply, {from:initialHolder})
                );
            });
        });
    });

    describe("transfer from", function() {
        const spender = recipient;

        describe("when the recipient is not the zero address", function() {
            const to = anotherAccount;

            describe("when the spender has enough approved balance", function() {
                beforeEach(async function() {
                    await this.token.approve(spender, initialSupply, {from: initialHolder});
                });

                describe("when the initial holder has enough balance", function() {
                    const amount = sending;
                    const fee = parseInt(sending * ratio / 100);

                    it("transfers the requested amount", async function() {
                        await this.token.transferFrom(initialHolder, to, amount, {from: spender});

                        (await this.token.balanceOf(
                        initialHolder
                        )).should.be.bignumber.equal((initialSupply - amount - fee).toString());

                        (await this.token.balanceOf(to)).should.be.bignumber.equal(amount.toString());
                    });

                    it("decreases the spender allowance", async function() {
                        await this.token.transferFrom(initialHolder, to, amount, {from: spender});

                        (await this.token.allowance(
                            initialHolder,
                            spender
                        )).should.be.bignumber.equal((initialSupply - amount).toString());
                    });

                    it("emits a transfer event", async function() {
                        const { logs } = await this.token.transferFrom(
                            initialHolder,
                            to,
                            amount,
                            {from:spender}
                        );

                        expectEvent.inLogs([logs.pop()], "Transfer", {
                            from: initialHolder,
                            to: to,
                            value: amount.toString()
                        });
                    });

                    it("emits an approval event", async function() {
                        const { logs } = await this.token.transferFrom(
                            initialHolder,
                            to,
                            amount,
                            {from:spender}
                        );

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: await this.token.allowance(initialHolder, spender)
                        });
                    });
                });

                describe("when the initial holder does not have enough balance", function() {
                    const amount = initialSupply.addn(1);

                    it("reverts", async function() {
                        await shouldFail.reverting(
                            this.token.transferFrom(initialHolder, to, amount, {from: spender})
                        );
                    });
                });
            });

            describe("when the spender does not have enough approved balance", function() {
                beforeEach(async function() {
                    await this.token.approve(spender, initialSupply.subn(1), {from: initialHolder});
                });

                describe("when the initial holder has enough balance", function() {
                    const amount = initialSupply;

                    it("reverts", async function() {
                        await shouldFail.reverting(
                            this.token.transferFrom(initialHolder, to, amount, {from: spender})
                        );
                    });
                });

                describe("when the initial holder does not have enough balance", function() {
                    const amount = initialSupply.addn(1);

                    it("reverts", async function() {
                        await shouldFail.reverting(
                            this.token.transferFrom(initialHolder, to, amount, {from: spender})
                        );
                    });
                });
            });
        });

        describe("when the recipient is the zero address", function() {
            const amount = initialSupply;
            const to = ZERO_ADDRESS;

            beforeEach(async function() {
                await this.token.approve(spender, amount, {from:initialHolder});
            });

            it("reverts", async function() {
                await shouldFail.reverting(
                    this.token.transferFrom(initialHolder, to, amount, {from:spender})
                );
            });
        });
    });

    describe("decrease allowance", function() {
        describe("when the spender is not the zero address", function() {
            const spender = recipient;

            function shouldDecreaseApproval(amount) {
                describe("when there was no approved amount before", function() {
                    it("reverts", async function() {
                        await shouldFail.reverting(
                            this.token.decreaseAllowance(spender, amount, {from: initialHolder})
                        );
                    });
                });

                describe("when the spender had an approved amount", function() {
                    const approvedAmount = amount;

                    beforeEach(async function() {
                        ({ logs: this.logs } = await this.token.approve(
                        spender,
                        approvedAmount,
                        {from:initialHolder}
                        ));
                    });

                    it("emits an approval event", async function() {
                        const { logs } = await this.token.decreaseAllowance(
                        spender,
                        approvedAmount,
                        {from:initialHolder}
                        );

                        expectEvent.inLogs(logs, "Approval", {
                        owner: initialHolder,
                        spender: spender,
                        value: new BN(0)
                        });
                    });

                    it("decreases the spender allowance subtracting the requested amount", async function() {
                        await this.token.decreaseAllowance(
                        spender,
                        approvedAmount.subn(1),
                        {from:initialHolder}
                        );

                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal("1");
                    });

                    it("sets the allowance to zero when all allowance is removed", async function() {
                        await this.token.decreaseAllowance(spender, approvedAmount, {from: initialHolder});
                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal("0");
                    });

                    it("reverts when more than the full allowance is removed", async function() {
                        await shouldFail.reverting(
                        this.token.decreaseAllowance(spender, approvedAmount.addn(1), {from: initialHolder})
                        );
                    });
                });
            }

            describe("when the sender has enough balance", function() {
                const amount = initialSupply;

                shouldDecreaseApproval(amount);
            });

            describe("when the sender does not have enough balance", function() {
                const amount = initialSupply.addn(1);

                shouldDecreaseApproval(amount);
            });
        });

        describe("when the spender is the zero address", function() {
            const amount = initialSupply;
            const spender = ZERO_ADDRESS;

            it("reverts", async function() {
                await shouldFail.reverting(
                this.token.decreaseAllowance(spender, amount, {from:initialHolder})
                );
            });
        });
    });

    describe("increase allowance", function() {
        const amount = initialSupply;

        describe("when the spender is not the zero address", function() {
            const spender = recipient;

            describe("when the sender has enough balance", function() {
                    it("emits an approval event", async function() {
                        const { logs } = await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                        expectEvent.inLogs(logs, "Approval", {
                            owner: initialHolder,
                            spender: spender,
                            value: amount
                        });
                    });

                describe("when there was no approved amount before", function() {
                    it("approves the requested amount", async function() {
                        await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });

                describe("when the spender had an approved amount", function() {
                    beforeEach(async function() {
                        await this.token.approve(spender, new BN(1), {from: initialHolder});
                    });

                    it("increases the spender allowance adding the requested amount", async function() {
                        await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal(amount.addn(1));
                    });
                });
            });

            describe("when the sender does not have enough balance", function() {
                const amount = initialSupply.addn(1);

                it("emits an approval event", async function() {
                    const { logs } = await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                    expectEvent.inLogs(logs, "Approval", {
                        owner: initialHolder,
                        spender: spender,
                        value: amount
                    });
                });

                describe("when there was no approved amount before", function() {
                    it("approves the requested amount", async function() {
                        await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });

                describe("when the spender had an approved amount", function() {
                    beforeEach(async function() {
                        await this.token.approve(spender, new BN(1), {from: initialHolder});
                    });

                    it("increases the spender allowance adding the requested amount", async function() {
                        await this.token.increaseAllowance(spender, amount, {from: initialHolder});

                        (await this.token.allowance(
                        initialHolder,
                        spender
                        )).should.be.bignumber.equal(amount.addn(1));
                    });
                });
            });
        });

        describe("when the spender is the zero address", function() {
        const spender = ZERO_ADDRESS;

        it("reverts", async function() {
            await shouldFail.reverting(
            this.token.increaseAllowance(spender, amount, {from:initialHolder})
            );
        });
        });
    });

    describe("mint", function() {
        const amount = new BN(50 * 10 ** _decimals);

        it("rejects a null account", async function() {
            await shouldFail.reverting(
                this.token.mint(ZERO_ADDRESS, amount / 10 ** _decimals)
            );
        });

        describe("for a non null account", function() {
            beforeEach("minting", async function() {
                const { logs } = await this.token.mint(
                recipient,
                amount / 10 ** _decimals
                );
                this.logs = logs;
            });

            it("increments totalSupply", async function() {
                const expectedSupply = initialSupply.add(amount);
                (await this.token.totalSupply()).should.be.bignumber.equal(
                expectedSupply
                );
            });

            it("increments recipient balance", async function() {
                (await this.token.balanceOf(recipient)).should.be.bignumber.equal(
                amount
                );
            });

            it("emits Transfer event", async function() {
                const event = expectEvent.inLogs(this.logs, "Transfer", {
                from: ZERO_ADDRESS,
                to: recipient
                });

                event.args.value.should.be.bignumber.equal(amount);
            });
        });
    });

    describe("burn", function() {
        describe("for a non null account", function() {
        it("rejects burning more than balance", async function() {
            await this.token.transfer(deployer, initialSupply, {from: initialHolder});
            await shouldFail.reverting(this.token.burn(initialSupply.addn(1)));
        });

        const describeBurn = function (description, amount) {
            const fee = parseInt(sending * ratio / 100);

            describe(description, function() {
                beforeEach("send to contract owner, then burn", async function() {
                    await this.token.transfer(deployer, amount, {from: initialHolder});
                    const { logs } = await this.token.burn(amount / 10 ** _decimals);
                    this.logs = logs;
                });

                it("decrements totalSupply", async function() {
                    const expectedSupply = initialSupply.sub(amount);
                    (await this.token.totalSupply()).should.be.bignumber.equal(
                    expectedSupply
                    );
                });

                it("decrements initialHolder balance", async function() {
                    const expectedBalance = initialSupply.sub(amount);
                    (await this.token.balanceOf(
                    initialHolder
                    )).should.be.bignumber.equal(expectedBalance);
                });

                it("emits Transfer event", async function() {
                    const event = expectEvent.inLogs(this.logs, "Transfer", {
                    from: deployer,
                    to: ZERO_ADDRESS
                    });

                    event.args.value.should.be.bignumber.equal(amount);
                });
            });
        };

        describeBurn("for entire balance", new BN(sending));
        describeBurn(
            "for less amount than balance",
            initialSupply.subn(1 * 10 ** _decimals)
        );
        });
    });
    
    describe("burnFrom", function() {
        const allowance = new BN(70 * 10 ** _decimals);

        const spender = anotherAccount;

        beforeEach("approving", async function() {
        await this.token.approve(deployer, allowance, {from:initialHolder});
        });

        it("rejects a null account", async function() {
        await shouldFail.reverting(this.token.burnFrom(ZERO_ADDRESS, new BN(1)));
        });

        describe("for a non null account", function() {
        it("rejects burning more than allowance", async function() {
            await shouldFail.reverting(
            this.token.burnFrom(
                initialHolder,
                allowance.addn(100) / 10 ** _decimals
            )
            );
        });

        it("rejects burning more than balance", async function() {
            await shouldFail.reverting(
            this.token.burnFrom(
                initialHolder,
                initialSupply.addn(100) / 10 ** _decimals
            )
            );
        });

        const describeBurnFrom = function (description, amount) {
            describe(description, function() {
            beforeEach("let admin to burn from initialHolder", async function() {
                const { logs } = await this.token.burnFrom(
                initialHolder,
                amount / 10 ** _decimals,
                {from:deployer}
                );
                this.logs = logs;
            });

            it("decrements totalSupply", async function() {
                const expectedSupply = initialSupply.sub(amount);
                (await this.token.totalSupply()).should.be.bignumber.equal(
                expectedSupply
                );
            });

            it("decrements initialHolder balance", async function() {
                const expectedBalance = initialSupply.sub(amount);
                (await this.token.balanceOf(
                initialHolder
                )).should.be.bignumber.equal(expectedBalance);
            });

            it("decrements spender allowance", async function() {
                const expectedAllowance = allowance.sub(amount);
                (await this.token.allowance(
                initialHolder,
                deployer
                )).should.be.bignumber.equal(expectedAllowance);
            });

            it("emits a Transfer event", async function() {
                const event = expectEvent.inLogs(this.logs, "Transfer", {
                from: initialHolder,
                to: ZERO_ADDRESS
                });

                event.args.value.should.be.bignumber.equal(amount);
            });

            it("emits an Approval event", async function() {
                expectEvent.inLogs(this.logs, "Approval", {
                owner: initialHolder,
                spender: deployer,
                value: await this.token.allowance(initialHolder, deployer)
                });
            });
            });
        };

        describeBurnFrom("for entire allowance", allowance);
        describeBurnFrom("for less amount than allowance", allowance.subn(100));
        });
    });

    describe("approve", function() {
        testApprove(initialHolder, recipient, initialSupply, function (
        owner,
        spender,
        amount
        ) {
        return this.token.approve(spender, amount, {from:owner});
        });
    });
    
    function testApprove(owner, spender, supply, approve) {
        describe("when the spender is not the zero address", function() {
            describe("when the sender has enough balance", function() {
                const amount = supply;

                it("emits an approval event", async function() {
                    const { logs } = await approve.call(this, owner, spender, amount);

                    expectEvent.inLogs(logs, "Approval", {
                        owner: owner,
                        spender: spender,
                        value: amount
                    });
                });

                describe("when there was no approved amount before", function() {
                    it("approves the requested amount", async function() {
                        await approve.call(this, owner, spender, amount);

                        (await this.token.allowance(
                        owner,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });

                describe("when the spender had an approved amount", function() {
                    beforeEach(async function() {
                        await approve.call(this, owner, spender, new BN(1));
                    });

                    it("approves the requested amount and replaces the previous one", async function() {
                        await approve.call(this, owner, spender, amount);

                        (await this.token.allowance(
                        owner,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });
            });

            describe("when the sender does not have enough balance", function() {
                const amount = supply.addn(1);

                it("emits an approval event", async function() {
                    const { logs } = await approve.call(this, owner, spender, amount);

                    expectEvent.inLogs(logs, "Approval", {
                        owner: owner,
                        spender: spender,
                        value: amount
                    });
                });

                describe("when there was no approved amount before", function() {
                    it("approves the requested amount", async function() {
                        await approve.call(this, owner, spender, amount);

                        (await this.token.allowance(
                        owner,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });

                describe("when the spender had an approved amount", function() {
                    beforeEach(async function() {
                        await approve.call(this, owner, spender, new BN(1));
                    });

                    it("approves the requested amount and replaces the previous one", async function() {
                        await approve.call(this, owner, spender, amount);

                        (await this.token.allowance(
                        owner,
                        spender
                        )).should.be.bignumber.equal(amount);
                    });
                });
            });
        });

        describe("when the spender is the zero address", function() {
        it("reverts", async function() {
            await shouldFail.reverting(
            approve.call(this, owner, ZERO_ADDRESS, supply)
            );
        });
        });
    }
    
    describe('withdraw', async function() {
        describe('when collectors withdraw fee', async function() {
            it('no fee to withdraw', async function() {
                await this.token.transfer(toWhiteList1, 1000, {from:initialHolder});
                await this.token.transfer(toWhiteList2, 1000, {from:initialHolder});

                const feeLogs = await rupiahFeeCollector.withdraw({from:normalAccount});
                const fee = feeLogs.logs[0].args.value;

                fee.should.be.bignumber.equal("0");
            });
            it('withdraw fee', async function() {
                await this.token.transfer(fromWhiteList1, 1000, {from:initialHolder});
                await this.token.transfer(deployer, 1000, {from:initialHolder});

                const tokenBalance = await this.token.balanceOf(rupiahFeeCollector.address);
                const fee1Logs = await rupiahFeeCollector.withdraw({from:fromWhitelist2});
                const fee2Logs = await rupiahFeeCollector.withdraw({from:normalAccount});

                const fee1 = fee1Logs.logs[0].args.value;
                const fee2 = fee2Logs.logs[0].args.value;

                tokenBalance.should.be.bignumber.equal(fee1.add(fee2));
            });
        });
        describe('when non collectors withdraw fee', async function() {
            it('withdraw fee', async function() {
                await this.token.transfer(fromWhiteList1, 1000, {from:initialHolder});
                await this.token.transfer(deployer, 1000, {from:initialHolder});

                await shouldFail.reverting(
                rupiahFeeCollector.withdraw({from:deployer})
                );
            });
        });
    }); 
    
    describe('withdrawAll', async function() {
        describe('when owner call withdrawAll the function', async function() {
            it('no fee to withdraw', async function() {
                await this.token.transfer(toWhiteList1, 1000, {from:initialHolder});
                await this.token.transfer(toWhiteList2, 1000, {from:initialHolder});

                const feeLogs = await rupiahFeeCollector.withdrawAll({from:deployer});
                const fee = feeLogs.logs[0].args.value;

                fee.should.be.bignumber.equal("0");
            });
            it('when not owner call', async function() {
                await this.token.transfer(fromWhiteList1, 1000, {from:initialHolder});
                await this.token.transfer(deployer, 1000, {from:initialHolder});

                await shouldFail.reverting(
                rupiahFeeCollector.withdrawAll({from:initialHolder})
                );
            });
        });
    });
    
    describe('addWhitelist & deleteWhitelist', async function() {
        describe('when deleting from whitelist', async function() {
            it('not belong to TO whitelist', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.deleteWhitelist(fromWhiteList1, 1, {from:deployer})
                );
            });
            it('not owner', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.deleteWhitelist(toWhiteList1, 1, {from:fromWhiteList1})
                );
            });
            it('not belong to FROM whitelist', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.deleteWhitelist(toWhiteList1, 0, {from:deployer})
                );
            });
            it('not owner', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.deleteWhitelist(fromWhiteList1, 0, {from:toWhiteList1})
                );
            });
        });
        describe('adding whitelist after deleting', async function() {
            it('delete account fromWhitelist & add account fromWhitelist', async function() {
                let isWhite = await rupiahFeeCollector.isWhitelist(fromWhiteList1, 0, {from:deployer});
                isWhite.should.equal(isWhite, true);
                await rupiahFeeCollector.deleteWhitelist(fromWhiteList1, 0, {from:deployer});
                isWhite = await rupiahFeeCollector.isWhitelist(fromWhiteList1, 0, {from:deployer});
                isWhite.should.equal(isWhite, false);
                await rupiahFeeCollector.addWhitelist(fromWhiteList1, 0, {from:deployer});
                isWhite = await rupiahFeeCollector.isWhitelist(fromWhiteList1, 0, {from:deployer});
                isWhite.should.equal(isWhite, true);
            });
            it('delete account TO whitelist & add account toWhitelist', async function() {
                isWhite = await rupiahFeeCollector.isWhitelist(toWhiteList1, 1, {from:deployer});
                isWhite.should.equal(isWhite, true);
                await rupiahFeeCollector.deleteWhitelist(toWhiteList1, 1, {from:deployer});
                isWhite = await rupiahFeeCollector.isWhitelist(toWhiteList1, 1, {from:deployer});
                isWhite.should.equal(isWhite, false);
                await rupiahFeeCollector.addWhitelist(toWhiteList1, 1, {from:deployer});
                isWhite = await rupiahFeeCollector.isWhitelist(toWhiteList1, 1, {from:deployer});
                isWhite.should.equal(isWhite, true);
            });
        });
    });

    describe('addFeeWithCollector & deleteFeeWithCollector', async function() {
        const fee = 60;
        describe('when deleting from collectorlist', async function() {
            it('not owner', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.deleteFeeWithCollector(normalAccount, {from:fromWhiteList1})
                );
            });
        });
        describe('when adding to collectorlist', async function() {
            it('adding duplicated account to collector list', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.addFeeWithCollector(normalAccount, fee, {from:deployer})
                );
            });
            it('not owner', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.addFeeWithCollector(toWhiteList1, fee, {from:normalAccount})
                );
            });
        });

        describe('adding collectorlist after deleting', async function() {
            it('delete account collector list & add account', async function() {
                let isCollect = await rupiahFeeCollector.isCollector({from:normalAccount});
                isCollect.should.equal(isCollect, true);
                await rupiahFeeCollector.deleteFeeWithCollector(normalAccount, {from:deployer});
                isCollect = await rupiahFeeCollector.isCollector({from:normalAccount});
                isCollect.should.equal(isCollect, false);
                await rupiahFeeCollector.addFeeWithCollector(normalAccount, fee, {from:deployer});
                isCollect = await rupiahFeeCollector.isCollector({from:normalAccount});
                isCollect.should.equal(isCollect, true);
            });
        });
    });

    describe('transferBridge', async function() {
        it ('when bridge is NOT sort of FeeCollector', async function() {
            await shouldFail.reverting(
                this.token.transferBridge(recipient, 1000, this.token.address, {from:initialHolder})
            );
        });
        it ('when using bridge address', async function() {
            await this.token.transferBridge(recipient, 1000, rupiahFeeCollector.address, {from:initialHolder});
        });
    });

    describe('setFeeRatio & getFeeRatio', async function() {
        const n = 5;
        const d = 100;
        const ratio = n / d;

        describe('setFeeRatio', async function() {
            it('when numerator is bigger than denominator', async function() {
                const bigN = d;
                const smallD = n;
                await shouldFail.reverting(
                rupiahFeeCollector.setFeeRatio(bigN, smallD, {from:deployer})
                );
            });
            it('not owner', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.setFeeRatio(n, d, {from:normalAccount})
                );
            });
        });
        describe('getFeeRatio', async function() {
            it('when call by contractAddress', async function() {
                await shouldFail.reverting(
                rupiahFeeCollector.getFeeRatio({from:this.token.address })
                );
            });
        });
        describe('check fee ratio whether setting correctly', async function() {
            it('integration', async function() {
                const sending = new BN(1000);
                const user = recipient;

                const holdersBalance = await this.token.balanceOf(initialHolder);
                await this.token.transfer(user, sending, {from:initialHolder});
                const middle = await this.token.balanceOf(initialHolder);
                const fee = holdersBalance - sending - (await this.token.balanceOf(initialHolder));

                await rupiahFeeCollector.setFeeRatio(n, d);

                const [ updatedN, updatedD ] = await rupiahFeeCollector.getFeeRatio();
                updatedN.should.be.bignumber.equal(new BN(n));
                updatedD.should.be.bignumber.equal(new BN(d));

                await this.token.transfer(user, sending, {from:initialHolder});
                const exceptedFee = parseInt(sending * ratio);

                const updatedFee = middle - sending - (await this.token.balanceOf(initialHolder));

                updatedFee.should.equal(exceptedFee);
                updatedFee.should.not.equal(fee);
            });
        });
    });
});