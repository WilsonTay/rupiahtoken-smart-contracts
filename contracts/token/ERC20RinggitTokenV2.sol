/**
 * Ringgit Token Smart Contract
 * Copyright (C) 2019 PT. Ringgit Token Indonesia <https://www.Ringgittoken.com/>. 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * This file incorporates work covered byt the following copyright and
 * permission notice:
 *
 *     OpenZeppelin <https://github.com/OpenZeppelin/openzeppelin-solidity/>     
 *     Copyright (c) 2016 Smart Contract Solutions, Inc.
 *     Modified for Ringgit Token by FengkieJ 2019.
 * 
 *     centre-tokens <https://github.com/centrehq/centre-tokens>
 *     Copyright CENTRE SECZ 2018.
 *     Modified for Ringgit Token by FengkieJ 2019.
 *
 *     ZeppelinOS (zos) <https://github.com/zeppelinos/zos>
 *     Copyright (c) 2018 ZeppelinOS Global Limited.
 *
 *     The MIT License (MIT)
 *
 *     Permission is hereby granted, free of charge, to any person obtaining a copy 
 *     of this software and associated documentation files (the "Software"), to deal 
 *     in the Software without restriction, including without limitation the rights 
 *     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 *     copies of the Software, and to permit persons to whom the Software is furnished to 
 *     do so, subject to the following conditions:
 *
 *     The above copyright notice and this permission notice shall be included in all 
 *     copies or substantial portions of the Software.
 *
 *     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 *     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 *     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
pragma solidity 0.4.25;

import "./ERC20RinggitTokenV1.sol";

/**
 * @title ERC20RinggitTokenV2 
 * @dev Version 2 for ERC20RinggitToken
 * For demo purpose of zos upgradeability 
 */
contract ERC20RinggitTokenV2 is ERC20RinggitToken {
    string constant public shouldBeAString = "Upgraded to V2";
    string public shouldBeEmptyString = "Upgraded to V2";

   /**
    * @dev Function to test new added functionality to the implementation.
    * @param success string to return
    * @return string memory from the input
    */
    function getUpgradeTest(string memory success) public pure returns (string memory) {
        return success;
    }
}
