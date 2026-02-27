// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// import "./utils/ownable.sol";
import "hardhat/console.sol";

contract MutiVoucher {
    struct Voucher {
        uint256 conversionRate; // exchange rate with ETH
        mapping(address => uint256) balances;
    }

    struct Service{
        bytes32 serviceName;
        bool isActive;
    }

    bytes32[] private voucherNames;
    bytes32[] private serviceNames;
    mapping(bytes32 => Voucher) private vouchers;
    mapping(bytes32 => Service) private services;

    event VoucherCreated(bytes32 voucherName, uint256 conversionRate);
    event VoucherPurchased(address buyer, bytes32 voucherName, uint256 amount);
    event VoucherUsed(address user, bytes32 voucherName, uint256 amount);
    event ServiceAdded(bytes32 serviceName);

    // Create new voucher and store in vouchers
    function createVoucher(
        bytes32 name,
        uint256 conversionRate
    ) external {
        // Only voucher that doesn't exist can be created
        require(!isVoucherExist(name), "Voucher already exist");
        require(conversionRate > 0,"Conversion rate must be greater than zero");
        // Create new voucher
        Voucher storage newVoucher = vouchers[name];
        newVoucher.conversionRate = conversionRate;
        voucherNames.push(name);

        emit VoucherCreated(name, conversionRate);
    }


    function buy(bytes32 name) external payable {
        require(isVoucherExist(name), "Voucher doesn't exist");
        require(msg.value > 0, "Message value must be greater than zero");
        // Attention the unit of value is wei
        uint256 expectedAmount = msg.value * vouchers[name].conversionRate;
        vouchers[name].balances[msg.sender] += expectedAmount;
        emit VoucherPurchased(msg.sender, name, expectedAmount);
    }

    function use(bytes32 name, bytes32 serviceName, uint256 amount) external {
        require(isVoucherExist(name), "Voucher doesn't exist");
        require(isServiceAvailable(serviceName), "Voucher doesn't approve service");
        require(amount > 0, "Amount must be greater than zero");
        require(
            vouchers[name].balances[msg.sender] >= amount,
            "Insufficient balance"
        );
        // Reduce balance
        vouchers[name].balances[msg.sender] -= amount;
        emit VoucherUsed(msg.sender, name, amount);
    }

    function addService(bytes32 serviceName) external{
        require(serviceName != bytes32(0), "Service name cannot be empty");
        require(!isServiceAvailable(serviceName), "Service already exists");
        services[serviceName] = Service(serviceName, true);
        serviceNames.push(serviceName);
        emit ServiceAdded(serviceName);
    }

    function deleteService(bytes32 serviceName) external{
        // Logic deletion
        require(isServiceAvailable(serviceName), "Service doesn't exist");
        services[serviceName].isActive = false;
    }

    function isServiceAvailable(bytes32 serviceName) public view returns (bool) {
        // service 存在并且没有被删除
        return services[serviceName].serviceName != bytes32(0) && services[serviceName].isActive;
    }

    function getAllServices() external view returns (bytes32[] memory) {
        uint256 activeCount;
        for (uint256 index = 0; index < serviceNames.length; index++) {
            if (isServiceAvailable(serviceNames[index])) {
                activeCount++;
            }
        }
        bytes32[] memory allServices = new bytes32[](activeCount);
        uint256 resultIndex;
        for (uint256 index = 0; index < serviceNames.length; index++) {
            bytes32 serviceName = serviceNames[index];
            if (isServiceAvailable(serviceName)) {
                allServices[resultIndex] = serviceName;
                resultIndex++;
            }
        }

        return allServices;
    }

    // Query balance of an address in voucher
    function balanceOf(
        bytes32 name,
        address user
    ) external view returns (uint256) {
        require(isVoucherExist(name), "Voucher doesn't exist");
        return vouchers[name].balances[user];
    }

    // Get all voucher names
    function getAllVouchers() external view returns (bytes32[] memory) {
        return voucherNames;
    }

    // Judege voucher exsit or not
    function isVoucherExist(bytes32 name) public view returns (bool) {
        return vouchers[name].conversionRate > 0;
    }

    // Get all voucher's conversion rate
    function getVoucherInfo(
        bytes32 name
    ) external view returns (uint256 conversionRate) {
        require(isVoucherExist(name), "Voucher doesn't exist");
        return vouchers[name].conversionRate;
    }
}
