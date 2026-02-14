// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InvoiceMarket
 * @notice Marketplace for factoring invoices - sellers get instant liquidity, investors earn yield
 * @dev Uses ERC20/TIP20 stablecoin for payments (required by Tempo blockchain)
 */
contract InvoiceMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Invoice {
        uint256 id;
        address seller;
        address buyer;
        address investor;
        uint256 faceValue;
        uint256 discountedValue;
        uint256 settlementDate;
        uint256 createdAt;
        InvoiceStatus status;
        string metadata;
    }

    enum InvoiceStatus { LISTED, SOLD, SETTLED, CANCELLED }

    // State variables
    mapping(uint256 => Invoice) private _invoices;
    uint256 public invoiceCount;
    uint256 public platformFeeRate = 50; // 0.5% in basis points
    address public feeCollector;
    uint256 public baseAPY = 1200; // 12% APY
    IERC20 public paymentToken; // TIP20 stablecoin used for payments

    // Events
    event InvoiceCreated(uint256 indexed invoiceId, address indexed seller, address indexed buyer, uint256 faceValue, uint256 settlementDate);
    event InvoicePurchased(uint256 indexed invoiceId, address indexed investor, uint256 paidAmount);
    event InvoiceSettled(uint256 indexed invoiceId, address indexed investor, uint256 amount);
    event InvoiceCancelled(uint256 indexed invoiceId);

    constructor(address _paymentToken) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
        feeCollector = msg.sender;
    }

    /**
     * @notice Create new invoice listing
     */
    function createInvoice(
        address _buyer,
        uint256 _faceValue,
        uint256 _daysUntilSettlement,
        string calldata _metadata
    ) external returns (uint256) {
        require(_faceValue > 0, "Face value must be positive");
        require(_daysUntilSettlement > 0 && _daysUntilSettlement <= 365, "Invalid settlement period");

        uint256 settlementDate = block.timestamp + (_daysUntilSettlement * 1 days);
        uint256 discountedValue = calculateDiscountedValue(_faceValue, _daysUntilSettlement);

        uint256 newId = ++invoiceCount;

        _invoices[newId] = Invoice({
            id: newId,
            seller: msg.sender,
            buyer: _buyer,
            investor: address(0),
            faceValue: _faceValue,
            discountedValue: discountedValue,
            settlementDate: settlementDate,
            metadata: _metadata,
            status: InvoiceStatus.LISTED,
            createdAt: block.timestamp
        });

        emit InvoiceCreated(newId, msg.sender, _buyer, _faceValue, settlementDate);
        return newId;
    }

    /**
     * @notice Investor purchases an invoice by paying discountedValue in stablecoin
     * @dev Investor must approve this contract to spend discountedValue before calling
     */
    function buyInvoice(uint256 _invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[_invoiceId];

        uint256 dValue = invoice.discountedValue;
        address seller = invoice.seller;

        require(invoice.id != 0, "Invoice does not exist");
        require(invoice.status == InvoiceStatus.LISTED, "Invoice not available");

        uint256 platformFee = (dValue * platformFeeRate) / 10000;
        uint256 sellerPayout = dValue - platformFee;

        invoice.investor = msg.sender;
        invoice.status = InvoiceStatus.SOLD;

        // Transfer stablecoin from investor to seller and fee collector
        paymentToken.safeTransferFrom(msg.sender, seller, sellerPayout);
        paymentToken.safeTransferFrom(msg.sender, feeCollector, platformFee);

        emit InvoicePurchased(_invoiceId, msg.sender, dValue);
    }

    /**
     * @notice Buyer settles the invoice by paying faceValue in stablecoin
     * @dev Buyer must approve this contract to spend faceValue before calling
     */
    function settleInvoice(uint256 _invoiceId) external nonReentrant {
        Invoice storage invoice = _invoices[_invoiceId];
        uint256 fValue = invoice.faceValue;
        address investor = invoice.investor;

        require(invoice.status == InvoiceStatus.SOLD, "Invoice not sold yet");
        require(msg.sender == invoice.buyer, "Only buyer can settle");

        invoice.status = InvoiceStatus.SETTLED;

        // Transfer stablecoin from buyer to investor
        paymentToken.safeTransferFrom(msg.sender, investor, fValue);

        emit InvoiceSettled(_invoiceId, investor, fValue);
    }

    /**
     * @notice Seller cancels invoice before sale
     */
    function cancelInvoice(uint256 _invoiceId) external {
        Invoice storage invoice = _invoices[_invoiceId];
        require(invoice.seller == msg.sender, "Only seller can cancel");
        require(invoice.status == InvoiceStatus.LISTED, "Can only cancel listed invoices");

        invoice.status = InvoiceStatus.CANCELLED;
        emit InvoiceCancelled(_invoiceId);
    }

    // --- View Functions ---

    function getInvoice(uint256 _invoiceId) external view returns (Invoice memory) {
        return _invoices[_invoiceId];
    }

    function calculateDiscountedValue(uint256 _faceValue, uint256 _daysUntilSettlement) public view returns (uint256) {
        uint256 discount = (_faceValue * _daysUntilSettlement * baseAPY) / (365 * 10000);
        return _faceValue - discount;
    }

    function calculateAPY(uint256 _invoiceId) public view returns (uint256) {
        Invoice storage invoice = _invoices[_invoiceId];
        if (invoice.settlementDate <= block.timestamp) return 0;
        uint256 daysRemaining = (invoice.settlementDate - block.timestamp) / 1 days;
        if (daysRemaining == 0) return 0;

        uint256 profit = invoice.faceValue - invoice.discountedValue;
        return (profit * 365 * 10000) / (invoice.discountedValue * daysRemaining);
    }

    function getListedInvoices() external view returns (Invoice[] memory) {
        uint256 total = invoiceCount;
        uint256 listedCount = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (_invoices[i].status == InvoiceStatus.LISTED) {
                unchecked { listedCount++; }
            }
        }

        Invoice[] memory listed = new Invoice[](listedCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (_invoices[i].status == InvoiceStatus.LISTED) {
                listed[index] = _invoices[i];
                unchecked { index++; }
            }
        }
        return listed;
    }

    function getMyInvoices(address _user) external view returns (Invoice[] memory) {
        uint256 total = invoiceCount;
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (_invoices[i].seller == _user) {
                unchecked { count++; }
            }
        }
        Invoice[] memory result = new Invoice[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (_invoices[i].seller == _user) {
                result[index] = _invoices[i];
                unchecked { index++; }
            }
        }
        return result;
    }

    // --- Admin ---

    function setBaseAPY(uint256 _newAPY) external onlyOwner {
        require(_newAPY <= 5000, "APY too high");
        baseAPY = _newAPY;
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Fee too high");
        platformFeeRate = _newFee;
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
    }
}
