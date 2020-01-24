#!/usr/bin/env node

const ccxt = require('./ccxt.js');

const pd = new ccxt.payruedex({
    'walletAddress': 'address',
    'privateKey': 'key',
    'apiKey': 'api_key',
    'verbose': 'true',
});


let amount = '10000';

let priceNumerator = '2000000';
let priceDenominator = '2000000';

let feeNumerator = '1';
let feeDenominator = '25';

let nonce = '1575905216952';

let expirationTimestamp = (2 ** 128 - 1);


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
console.log("Order signed parameters are", order, values);

const hash = pd.getPayRueDexOrderHash(  //it's a new method implemented in Exchange.js
    {
        'direction':1,
        'address':'0x3fEaf47f1FDd9c692710818bd1CBfcB49B958050',
        'tokenBaseAddress':'0xfca47962d45adfdfd1ab2d972315db4ce7ccf094',
        'tokenQuoteAddress':'0x0000000000000000000000000000000000000000',
        'tokenFeeAddress':'0x0000000000000000000000000000000000000000',
        'amount':'10000',
        'priceNumerator':'2000000',
        'priceDenominator':'2000000',
        'feeNumerator':'25',
        'feeDenominator':'10000',
        'nonce':'1575905216952',
    });

console.log(hash);

//new method do sign also implemented in the Exchange.js
console.log (pd.signPayrueMessage(hash, pd.privateKey));
