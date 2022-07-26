import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

const useStyles = makeStyles((theme)=>({
    root: {
        '& > *': {
          margin: theme.spacing(1),
          width: '25ch',
        },
    },
    })
);

export default function DistributorViewReceivedItemProducto(props) {
    const classes = useStyles();
    const [account] = useState(props.account);
    const [web3, setWeb3] = useState(props.web3);
    const [supplyChain] = useState(props.supplyChain);
    const [loading, isLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);

    async function handleSubmit() {
        var itemProductoAddresses = await supplyChain.methods.getAllItemProductosAtDistributor().call({from: account});

        var components = itemProductoAddresses.map((addr) => {
          return <div><ul><li>
              <Link to={{ pathname: `/distributor/view-itemProducto/${addr}`, query: {address: addr, account: account, web3: web3, supplyChain: supplyChain}}}>{addr}</Link>
          </li></ul></div>;
        });
        setAddresses(components);
        isLoading(true);
    }
    if(loading){
        return(
            <div>
                <h4>Received ItemProducto at Distributor: </h4>
                { addresses }
            </div>
        )
    }
    else{
        handleSubmit();
        return(
            <h4>Getting details</h4>
        )
    }
    
}