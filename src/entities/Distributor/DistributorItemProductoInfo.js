import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Loader from '../../components/Loader';
import RawMaterial from '../../build/RawMaterial.json';
import ItemProducto from '../../build/Product.json';
import Transactions from '../../build/Transactions.json';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import CustomStepper from '../../main_dashboard/components/Stepper/Stepper';
import axios from 'axios';

const useStyles = makeStyles((theme) => ({
    root: {
        '& > *': {
            margin: theme.spacing(1),
            width: '25ch',
        },
    },
}));

export default function DistributorItemProductoInfo(props) {
    const classes = useStyles();
    const [account] = useState(props.location.query.account);
    const [itemProductoAddress] = useState(props.location.query.address);
    const [web3] = useState(props.location.query.web3);
    const [supplyChain] = useState(props.location.query.supplyChain);
    const [distributor, setDistributor] = useState("");
    const [details, setDetails] = useState({});
    const [loading, isLoading] = useState(true);

    async function getItemProductoData() {
        let itemProducto = new web3.eth.Contract(ItemProducto.abi, itemProductoAddress);
        let data = await itemProducto.methods.getItemProductoInfo().call({ from: account });
        let subcontractAddressWD = await supplyChain.methods.getSubContractWD(itemProductoAddress).call({ from: account });
        let subcontractAddressDC = await supplyChain.methods.getSubContractDC(itemProductoAddress).call({ from: account });
        let status = data[6];
        console.log(status);
        let txt = "NA";
        let activeStep = Number(status);
        console.log(status);

        if (status === 2) {
            activeStep = 3
        } else if (status === 3) {
            activeStep = 2
            // txt = 'Delivered to Wholesaler';
        }
        data[1] = web3.utils.hexToUtf8(data[1]);
        setDistributor(data[5]);

        let display = <div>
            <p>Product Address: {itemProductoAddress}</p>
            <p>Product Manufacturer: {data[0]}</p>
            <p>Description: {data[1]}</p>
            <p>Product Raw Materials: {data[2]}</p>
            <p>Product Quantity: {data[3]}</p>
            <p>Product Transporter: {data[4]}</p>
            <p>Product Wholesaler: {data[8]}</p>
            <p>Product Distributor: {data[5]}</p>
            <p>Product Transaction contract address: <Link to={{ pathname: `/distributor/view-transaction/${data[7]}`, query: { address: data[7], account: account, web3: web3 } }}>{data[7]}</Link>
            </p>
            <p>Subcontract Address W-D: {subcontractAddressWD}</p>
            <p>Subcontract Address D-C: {subcontractAddressDC}</p>
            <CustomStepper
                getSteps={getSupplyChainSteps}
                activeStep={activeStep}
                getStepContent={getSupplyChainStepContent}
            />
        </div>;
        setDetails(display);
        isLoading(false);
    }

    function getSupplyChainSteps() {
        return ['At Manufacturer', 'Collected by Transporter', 'Delivered to Wholesaler', 'Collected by Transporter', 'Delivered to Distributor', 'Collected by Transporter', 'ItemProducto Delivered'];
    }

    function getSupplyChainStepContent(stepIndex) {
        switch (stepIndex) {
            case 0:
                return 'ItemProducto at manufacturing stage in the supply chain.';
            case 1:
                return 'ItemProducto collected by the Transporter is on its way to you.';
            case 2:
                return 'Wholesaler, the itemProducto is currently with you!';
            case 3:
                return 'ItemProducto is collected by the Transporter! On its way to the Distributor.';
            case 4:
                return 'ItemProducto is delivered to the Distributor';
            case 5:
                return 'ItemProducto collected by Transporter is on its way to the pharmacy/customer.';
            case 6:
                return 'ItemProducto Delivered Successfully!';
            default:
                return 'Unknown stepIndex';
        }
    }

    function sendPackage() {
        let itemProducto = new web3.eth.Contract(ItemProducto.abi, itemProductoAddress);
        let signature = prompt('Enter signature');
        supplyChain.methods.sendPackageToEntity(distributor, account, itemProductoAddress, signature).send({ from: account })
            .once('receipt', async (receipt) => {
                let data = await itemProducto.methods.getItemProductoInfo().call({ from: account });
                let txnContractAddress = data[7];
                let transporterAddress = data[4][data[4].length - 1];
                let txnHash = receipt.transactionHash;
                const transactions = new web3.eth.Contract(Transactions.abi, txnContractAddress);
                let txns = await transactions.methods.getAllTransactions().call({ from: account });
                let prevTxn = txns[txns.length - 1][0];
                transactions.methods.createTxnEntry(txnHash, account, transporterAddress, prevTxn, '10', '10').send({ from: account });
            });
    }

    async function saveItemProductoDetails() {
        isLoading(true);
        let itemProducto = new web3.eth.Contract(ItemProducto.abi, itemProductoAddress);
        let data = await itemProducto.methods.getItemProductoInfo().call({ from: account });

        let transaction = new web3.eth.Contract(Transactions.abi, data[7]);
        let txns = await transaction.methods.getAllTransactions().call({ from: account });

        let fromAddresses = [];
        let toAddresses = [];
        let hash = [];
        let previousHash = [];
        let geoPoints = [];
        let timestamps = [];

        for (let txn of txns) {
            fromAddresses.push(txn[1]);
            toAddresses.push(txn[2]);
            hash.push(txn[0]);
            previousHash.push(txn[3]);
            geoPoints.push([Number(txn[4]), Number(txn[5])]);
            timestamps.push(Number(txn[6]));
        }

        axios.post('http://localhost:8000/api/itemProducto/save-details', {
            'itemProductoAddress': itemProductoAddress,
            'description': web3.utils.hexToUtf8(data[1]),
            'quantity': Number(data[3]),
            'rawMaterialAddress': data[2][0]
        }).then((response) => {
            console.log(response.data);
            axios.post('http://localhost:8000/api/transaction/save-details', {
                'itemProductoAddress': itemProductoAddress,
                'fromAddresses': fromAddresses,
                'toAddresses': toAddresses,
                'hash': hash,
                'previousHash': previousHash,
                'geoPoints': geoPoints,
                'timestamps': timestamps,
            }).then((response) => {
                isLoading(false);
                alert('ItemProducto Info is saved to Database successfully!');
                console.log(response.data);
            }).catch((e) => {
                isLoading(false);
                console.log(e);
            })            
        }).catch((e) => {
            isLoading(false);
            console.log(e);
        })
    }


    useEffect(() => {
        getItemProductoData();
    }, []);


    if (loading) {
        return (
            <Loader></Loader>
        );
    } else {
        return (
            <div>
                <h1>Product Details</h1>
                <p>{details}</p>
                <Button variant="contained" color="primary" ><Link to={{ pathname: `/distributor/view-requests/${itemProductoAddress}`, query: { address: itemProductoAddress, account: account, web3: web3, supplyChain: supplyChain } }}>View Requests</Link></Button>&nbsp;&nbsp;&nbsp;
                <Button variant="contained" color="primary" onClick={sendPackage}>Send Package</Button>&nbsp;&nbsp;&nbsp;
                <Button variant="contained" color="primary" onClick={saveItemProductoDetails}>Save ItemProducto Info to Database</Button>
            </div>
        );
    }
}