import { Button, Input, Space } from "antd";
import Text from "antd/lib/typography/Text";
import { useEffect, useState } from "react";
import { useMoralis } from "react-moralis";
import TextArea from "antd/lib/input/TextArea";
import ReactHtmlParser from "react-html-parser";
import { PolygonLogo, ETHLogo, BSCLogo } from "./Logos.jsx";
import abi from './abi.jsx';

const styles = {
  card: {
    alignItems: "center",
    width: "100%",
    overflow_y: "scroll",
  },
  header: {
    textAlign: "center",
  },
  input: {
    width: "100%",
    outline: "none",
    fontSize: "16px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textverflow: "ellipsis",
    appearance: "textfield",
    color: "#041836",
    fontWeight: "700",
    border: "none",
    backgroundColor: "transparent",
  },
  select: {
    marginTop: "20px",
    display: "flex",
    alignItems: "center",
  },
  textWrapper: { maxWidth: "120px", width: "100%" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexDirection: "row",
  },
};

function InputForm() {
  const moralisipfs = 'https://ipfs.moralis.io:2053/ipfs';
  const { Moralis } = useMoralis();
  const [NftName, setNftName] = useState();
  const [nftDescription, setNftDescription] = useState();
  const [nftImage, setNftImage] = useState();
  const [metadataHash, setMetadataHash] = useState();
  const [tx, setTx] = useState();
  const [isPending, setIsPending] = useState(false);
  const [resultMsg, setResultmsg] = useState('');
  // const abi = [nft_abi];
  const contractAddress = '0xe928f0165FD228fd3C24c46c9AAcEcD8a407330c';

  useEffect(() => {
    ((NftName && nftDescription && nftImage) || metadataHash)
      ? setTx({ NftName, nftDescription, nftImage, metadataHash }) : setTx();
  }, [NftName, nftDescription, nftImage, metadataHash]);

  async function createnft() {
    setIsPending(true);
    let user = Moralis.User.current();
    if (user) {
      let imageHash = '';
      let _metadataHash = metadataHash;
      if (!_metadataHash) {
        setResultmsg('1/3: save image to IPFS & create metadata...');
        console.log('User: ', user);
        console.log('Eth Address' + user.get('ethAddress'));
        const { NftName, nftDescription, nftImage } = tx;
        console.log('NftName=' + NftName);
        console.log('nftDescription=' + nftDescription);
        console.log('file: ', nftImage);
        console.log('file name=' + nftImage.name);
        // Get image data
        const imageFile = new Moralis.File(nftImage.name, nftImage);
        await imageFile.saveIPFS();
        imageHash = imageFile.hash();
        console.log('imagehash=' + imageHash);
        console.log('imagefile ipfs: ', imageFile.ipfs());
        // Create metadata..
        let metadata = {
          name: NftName,
          description: nftDescription,
          image: moralisipfs + '/' + imageHash
        }
        // Upload metadata to IPFS..
        setResultmsg('2/3: upload metadata to IPFS...');
        const jsonFile = new Moralis.File("metadata.json", { base64: btoa(JSON.stringify(metadata)) });
        await jsonFile.saveIPFS();
        _metadataHash = jsonFile.hash();
      }
      console.log('metadataHash=' + _metadataHash);
      if (_metadataHash) {
        setResultmsg('3/3: mint to Ethereum Rinkeby testnet (sign in wallet)...');
        const tokenURI = moralisipfs + '/' + _metadataHash;
        console.log('tokenURI=' + tokenURI);
        console.log('abi: ' + abi);
        const options = {
          contractAddress: contractAddress,
          functionName: 'mintToken',
          abi: abi,
          params: {
            recipient: user.get('ethAddress'),
            tokenURI: tokenURI,
          },
        };
        let res = await Moralis.executeFunction(options);
        console.log('receipt: ', res);
        let token_address = res.transactionHash;
        let token_id = res.transactionIndex;
        let url = `https://rinkeby.etherscan.io/tx/${token_address}`;
        setResultmsg(`Created: #` + token_id + ' '
          + (imageHash ? `<a href="${moralisipfs}/${imageHash}" target="_blank">image@ipfs</a> | ` : '')
          + `<a href="${tokenURI}" target="_blank">metadata@ipfs</a> | `
          + `<a href="${url}" target="_blank">NFT@Explorer</a>`
        );
      } else {
        setResultmsg('Not minted: metadataHash not set!');
      }
    } else {
      console.log('Unknown Moralis user!');
      setResultmsg('User not known / authenticated.., please do.');
    }
    setIsPending(false);
  }

  const fileImageOnchange = (e) => {
    setNftImage(e.target.files[0]);
  }

  return (
    <div style={styles.card}>
      <div style={styles.inputform}>
        <div style={styles.select}>
          <div style={styles.textWrapper}>
            <Text strong>Name:</Text>
          </div>
          <Input size="large" autoFocus onChange={(e) => { setNftName(`${e.target.value}`); }} disabled={isPending} />
        </div>
        <div style={styles.select}>
          <div style={styles.textWrapper}>
            <Text strong>Description:</Text>
          </div>
          <TextArea size="large" onChange={(e) => { setNftDescription(`${e.target.value}`); }} disabled={isPending} />
        </div>
        <div style={styles.select}>
          <div style={styles.textWrapper}>
            <Text strong>Image:</Text>
          </div>
          <input type="file" onChange={fileImageOnchange} disabled={isPending} />
        </div>
        <hr></hr>
        <div style={styles.select}>
          <div style={styles.textWrapper}>
            <Text strong>Upload with IPFS</Text>
          </div>
          <Input size="large" value={metadataHash} onChange={(e) => { setMetadataHash(`${e.target.value}`); }} disabled={isPending} />
        </div>
        <hr></hr>
        <div>{ReactHtmlParser(resultMsg)}</div>
        <Button
          type="primary"
          size="large"
          loading={isPending}
          style={{ width: "100%", marginTop: "25px" }}
          onClick={() => createnft()}
          disabled={!tx || isPending}
        >
          Create on Polygon<Space>  <PolygonLogo /></Space>
        </Button>

        <Button
          type="primary"
          size="large"
          loading={isPending}
          style={{ width: "100%", marginTop: "25px" }}
          onClick={() => createnft()}
          disabled={!tx || isPending}
        >
          Create on Ethereum<Space>  <ETHLogo /></Space>
        </Button>

        <Button
          type="primary"
          size="large"
          loading={isPending}
          style={{ width: "100%", marginTop: "25px" }}
          onClick={() => createnft()}
          disabled={!tx || isPending}
        >
          Create on BSC<Space>  <BSCLogo /></Space>
        </Button>
      </div>
    </div>
  );


}

export default InputForm;
