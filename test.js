#!/usr/bin/env node

const ccxt = require('./ccxt.js');

const pd = new ccxt.payruedex({
    'walletAddress': '0x3fEaf47f1FDd9c692710818bd1CBfcB49B958050',
    'privateKey': '0xB62964D13C7D59708D8FA57DC070FBB8065F2A2BCE25D34CB5F0F5F9D94891E0',
    'apiKey': '507d181c-69be-4a00-92ae-7fa89ccfcf27',
    'verbose': 'true',
});

const BigNumber = require("bignumber.js");

let amount = new BigNumber("10000");

let priceNumerator = new BigNumber(2000000);
let priceDenominator = new BigNumber(2000000);

let feeNumerator = new BigNumber(1);
let feeDenominator = new BigNumber(25);

let nonce = new BigNumber("1575905216952");
let expirationTimestamp = new BigNumber(2).pow(128).minus(1);

let order = {
    exchange: "0x205b2af20A899ED61788300C5b268c512D6b1CCE",
    direction: 1, // 1 for buy, 0 for sell
    address: "0x3fEaf47f1FDd9c692710818bd1CBfcB49B958050",
    tokenBaseAddress: "0xfca47962d45adfdfd1ab2d972315db4ce7ccf094", // ERC-20 address of traded token
    tokenQuoteAddress: "0x0000000000000000000000000000000000000000", //  ERC-20 address of price token
    tokenFeeAddress: "0x0000000000000000000000000000000000000000", // ERC-20 address of a token where the fees are paid
    amount: amount, // Token size of a limit order
    priceNumerator: priceNumerator,
    priceDenominator: priceDenominator,
    feeNumerator: feeNumerator,
    feeDenominator: feeDenominator,
    expirationTimestamp: expirationTimestamp,
    nonce: nonce,
};

const values = Object.values(order);

const hash = pd.getPayRueDexOrderHash(
    {
        exchange: "0x205b2af20A899ED61788300C5b268c512D6b1CCE",
        direction: 1,
        address: "0x3fEaf47f1FDd9c692710818bd1CBfcB49B958050",
        tokenBaseAddress: "0xfca47962d45adfdfd1ab2d972315db4ce7ccf094",
        tokenQuoteAddress: "0x0000000000000000000000000000000000000000",
        tokenFeeAddress: "0x0000000000000000000000000000000000000000",
        amount: 10000,
        priceNumerator: 10000,
        priceDenominator: 1,
        feeNumerator: 25,
        feeDenominator: 10000,
        expirationTimestamp: '340282366920938463463374607431768211455',
        nonce: 1575905216952,
    }
);

// console.log(pd.signPayrueMessage(hash, pd.privateKey));

// pd.createOrder('IXT/ETH','market', 'sell', 0.5, 0.0000005);
// pd.createOrder('IXT/ETH','market', 'buy', 0.7, 0.0000007);
pd.createOrder('IXT/ETH','limit', 'sell', 0.9, 0.0000009);
// pd.createOrder('IXT/ETH','limit', 'buy', 1, 0.000001);
// console.log(pd.fetchOHLCV('IXT/ETH'));
