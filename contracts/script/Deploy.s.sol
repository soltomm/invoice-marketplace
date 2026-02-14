// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/InvoiceMarket.sol";

contract DeployScript is Script {
    // AlphaUSD on Tempo Moderato testnet (6 decimals)
    address constant ALPHA_USD = 0x20C0000000000000000000000000000000000001;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        InvoiceMarket market = new InvoiceMarket(ALPHA_USD);
        
        console.log("======================================");
        console.log("InvoiceMarket deployed at:", address(market));
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Chain ID:", block.chainid);
        console.log("======================================");
        
        // Set initial parameters
        market.setBaseAPY(1200); // 12% APY
        market.setPlatformFee(50); // 0.5% fee
        
        console.log("Base APY set to: 12%");
        console.log("Platform fee set to: 0.5%");
        
        vm.stopBroadcast();
    }
}
