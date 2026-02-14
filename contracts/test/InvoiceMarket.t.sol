// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/InvoiceMarket.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockUSD is ERC20 {
    constructor() ERC20("MockUSD", "MUSD") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract InvoiceMarketTest is Test {
    InvoiceMarket public market;
    MockUSD public token;

    address seller = address(0x1111);
    address buyer = address(0x2222);
    address investor = address(0x3333);

    // Use 6 decimals like real stablecoins
    uint256 constant D6 = 1e6;

    function setUp() public {
        token = new MockUSD();
        market = new InvoiceMarket(address(token));

        // Mint tokens to participants
        token.mint(seller, 100_000 * D6);
        token.mint(buyer, 100_000 * D6);
        token.mint(investor, 100_000 * D6);

        // Approve market to spend tokens
        vm.prank(investor);
        token.approve(address(market), type(uint256).max);
        vm.prank(buyer);
        token.approve(address(market), type(uint256).max);
    }

    function testCreateInvoice() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(
            buyer,
            10_000 * D6,
            60,
            '{"invoiceNumber": "INV-001"}'
        );

        assertEq(invoiceId, 1);

        InvoiceMarket.Invoice memory invoice = market.getInvoice(1);
        assertEq(invoice.seller, seller);
        assertEq(invoice.buyer, buyer);
        assertEq(invoice.faceValue, 10_000 * D6);
        assertEq(uint(invoice.status), uint(InvoiceMarket.InvoiceStatus.LISTED));
    }

    function testCalculateDiscount() public view {
        uint256 discounted = market.calculateDiscountedValue(10_000 * D6, 60);
        // Should be approximately 9803 (10000 - 197)
        assertGt(discounted, 9_800 * D6);
        assertLt(discounted, 9_805 * D6);
    }

    function testBuyInvoice() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        uint256 sellerBalanceBefore = token.balanceOf(seller);

        vm.prank(investor);
        market.buyInvoice(invoiceId);

        InvoiceMarket.Invoice memory invoice = market.getInvoice(invoiceId);
        assertEq(invoice.investor, investor);
        assertEq(uint(invoice.status), uint(InvoiceMarket.InvoiceStatus.SOLD));
        assertGt(token.balanceOf(seller), sellerBalanceBefore);
    }

    function testSettleInvoice() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        vm.prank(investor);
        market.buyInvoice(invoiceId);

        uint256 investorBalanceBefore = token.balanceOf(investor);

        vm.prank(buyer);
        market.settleInvoice(invoiceId);

        InvoiceMarket.Invoice memory invoice = market.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(InvoiceMarket.InvoiceStatus.SETTLED));
        assertEq(token.balanceOf(investor), investorBalanceBefore + 10_000 * D6);
    }

    function testCalculateAPY() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        uint256 apy = market.calculateAPY(invoiceId);
        assertGt(apy, 1100);
        assertLt(apy, 1300);
    }

    function testCancelInvoice() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        vm.prank(seller);
        market.cancelInvoice(invoiceId);

        InvoiceMarket.Invoice memory invoice = market.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(InvoiceMarket.InvoiceStatus.CANCELLED));
    }

    function testCannotBuyCancelledInvoice() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        vm.prank(seller);
        market.cancelInvoice(invoiceId);

        vm.prank(investor);
        vm.expectRevert("Invoice not available");
        market.buyInvoice(invoiceId);
    }

    function testOnlyBuyerCanSettle() public {
        vm.prank(seller);
        uint256 invoiceId = market.createInvoice(buyer, 10_000 * D6, 60, "");

        vm.prank(investor);
        market.buyInvoice(invoiceId);

        address maliciousUser = address(0x999);
        token.mint(maliciousUser, 100_000 * D6);
        vm.prank(maliciousUser);
        token.approve(address(market), type(uint256).max);
        vm.prank(maliciousUser);
        vm.expectRevert("Only buyer can settle");
        market.settleInvoice(invoiceId);
    }

    function testGetListedInvoices() public {
        vm.prank(seller);
        market.createInvoice(buyer, 5_000 * D6, 30, "");

        vm.prank(seller);
        market.createInvoice(buyer, 8_000 * D6, 45, "");

        vm.prank(seller);
        uint256 invoiceId3 = market.createInvoice(buyer, 12_000 * D6, 60, "");

        vm.prank(investor);
        market.buyInvoice(invoiceId3);

        InvoiceMarket.Invoice[] memory listed = market.getListedInvoices();
        assertEq(listed.length, 2);
    }
}
