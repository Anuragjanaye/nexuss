import axios from 'axios';

const JWT = import.meta.env.VITE_PINATA_JWT;

export const uploadJSONToIPFS = async (JSONBody) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    try {
        const response = await axios.post(url, JSONBody, {
            headers: {
                Authorization: `Bearer ${JWT}`
            }
        });
        return {
            success: true,
            pinataURL: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
            ipfsHash: response.data.IpfsHash
        };
    } catch (error) {
        console.error("Error uploading to Pinata:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

export const fetchProfileFromIPFS = async (ipfsHash) => {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    try {
        const response = await axios.get(url);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error("Error fetching from Pinata:", error);
        return {
            success: false,
            message: error.message
        };
    }
};
