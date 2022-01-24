import { Button, Input } from "antd";
import Text from "antd/lib/typography/Text";
import { useEffect, useState } from "react";
import { useMoralis } from "react-moralis";
import TextArea from "antd/lib/input/TextArea";
import ReactHtmlParser from "react-html-parser"; // yarn add react-html-parser

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
        console.log('Eth Address'+user.get('ethAddress'));
        const { NftName, nftDescription, nftImage } = tx;
        console.log('NftName='+NftName);
        console.log('nftDescription='+nftDescription);
        console.log('file: ', nftImage);
        console.log('file name='+nftImage.name);
        // Get image data
        const imageFile = new Moralis.File(nftImage.name, nftImage);
        await imageFile.saveIPFS();
        imageHash = imageFile.hash();
        console.log('imagehash='+imageHash);
        console.log('imagefile ipfs: ',imageFile.ipfs());
        // Create metadata with...
        let metadata = {
          name: NftName,
          description: nftDescription,
          image: moralisipfs +'/'+ imageHash
        }
        // Upload metadata to IPFS...
        setResultmsg('2/3: upload metadata to IPFS...');
        const jsonFile = new Moralis.File("metadata.json", {base64: btoa(JSON.stringify(metadata))});
        await jsonFile.saveIPFS();
        _metadataHash = jsonFile.hash();
      }
      console.log('metadataHash='+_metadataHash);
      if (_metadataHash) {
        setResultmsg('3/3: lazy mint to Rarible (sign in wallet)...');
        // => https://moralis.io/plugins/rarible-nft-tools/ for also immediate sell ..
        let res = await Moralis.Plugins.rarible.lazyMint({
          chain: 'rinkeby',
          userAddress: user.get('ethAddress'),
          tokenType: 'ERC721',
          tokenUri: moralisipfs +'/'+ _metadataHash,
          //supply: 1, // for ERC721 only 1
          royaltiesAmount: 5, // 0.05% royalty. Optional
        });
        console.log('Minting result:', res);
        // https://rinkeby.rarible.com/token/TOKEN_ADDRESS:TOKEN_ID
        let token_address = res.data.result.tokenAddress;
        let token_id = res.data.result.tokenId;
        let url = `https://rinkeby.rarible.com/token/${token_address}:${token_id}`;
        setResultmsg(`Created: `
          +`<a href="${moralisipfs}/${imageHash}" target="_blank">image@ipfs</a> | ` 
          +`<a href="${moralisipfs}/${_metadataHash}" target="_blank">metadata@ipfs</a> | `
          +`<a href="https://rinkeby.etherscan.io/tx/${token_address}" target="_blank">NTF@explorer</a> | `
          +`<a href="${url}" target="_blank">NFT@Rarible</a>`);
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
          <Input size="large" autoFocus onChange={(e) => {setNftName(`${e.target.value}`); }} disabled={isPending} />
        </div>
        <div style={styles.select}>
          <div style={styles.textWrapper}>
            <Text strong>Description:</Text>
          </div>
          <TextArea size="large" onChange={(e) => {setNftDescription(`${e.target.value}`); }} disabled={isPending} />
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
            <Text strong>Or IPFS-<br />metadataHash:</Text>
          </div>
          <Input size="large" value={metadataHash} onChange={(e) => {setMetadataHash(`${e.target.value}`); }} disabled={isPending} />
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
          Create NFT
        </Button>
      </div>
    </div>
  );
}

export default InputForm;
