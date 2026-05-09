import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as toxicity from '@tensorflow-models/toxicity';
import { uploadJSONToIPFS, fetchProfileFromIPFS } from './pinata';

const threshold = 0.9;

function App() {
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [ipfsHash, setIpfsHash] = useState('');

  useEffect(() => {
    const loadModel = async () => {
      try {
        setStatus('Initializing local AI Model (TensorFlow.js)...');
        const loadedModel = await toxicity.load(threshold);
        setModel(loadedModel);
        setStatus('System Ready.');
      } catch (e) {
        console.error(e);
        setStatus('Failed to load local AI model.');
      }
    };
    loadModel();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setStatus('Wallet connected securely.');
      } catch (error) {
        setStatus('Connection request denied.');
      }
    } else {
      setStatus('MetaMask not detected. Please install a Web3 wallet.');
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!account) return setStatus('Authentication required. Connect wallet first.');
    if (!model) return setStatus('AI model is still loading, please wait...');
    
    setLoading(true);
    setStatus('AI Validating identity data...');
    
    try {
      const predictions = await model.classify([bio]);
      const isToxic = predictions.some(pred => pred.results[0].match);
      
      if (isToxic) {
        setStatus('AI Guardian: Content violates safety policies. Please revise your bio.');
        setLoading(false);
        return;
      }

      setStatus('AI Guardian: Identity data verified. Encrypting to IPFS...');
      
      const profile = { 
        name, 
        bio, 
        address: account, 
        timestamp: new Date().toISOString(),
        verifiedBy: "Nexus Local AI"
      };
      
      const response = await uploadJSONToIPFS(profile);
      
      if (response.success) {
        setIpfsHash(response.ipfsHash);
        setStatus(`Profile anchored to IPFS.`);
      } else {
        setStatus(`IPFS Upload Failed: ${response.message}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('An error occurred during processing.');
    }
    setLoading(false);
  };

  const loadProfile = async () => {
    if (!ipfsHash) return setStatus('No active identity hash found in local state.');
    setLoading(true);
    setStatus('Resolving DID from IPFS network...');
    const response = await fetchProfileFromIPFS(ipfsHash);
    if (response.success) {
      setProfileData(response.data);
      setStatus('Identity resolved successfully.');
    } else {
      setStatus('Failed to resolve identity from IPFS.');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ paddingTop: '32px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
        <h2 style={{ color: 'var(--primary-container)' }}>NEXUS <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>Sovereign</span></h2>
        <div>
          {account ? (
            <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: 'var(--radius-xl)' }}>
              <span className="pulse-dot" style={{ marginRight: '8px' }}></span>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet}>
              Connect MetaMask
            </button>
          )}
        </div>
      </nav>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
        <section>
          <h1 style={{ marginBottom: '16px' }}>Own Your<br/>Digital Identity</h1>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '32px', fontSize: '18px' }}>
            Take control of your personal data without central authorities. Secure, private, and entirely yours. 
            Powered by local AI and the IPFS network.
          </p>

          <div className="glass-panel" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '24px' }}>Initialize Profile</h3>
            <form onSubmit={handleCreateProfile}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Alias / Name</label>
                <input 
                  className="input-field" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="Neo"
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="label">Bio (AI Monitored)</label>
                <textarea 
                  className="input-field" 
                  rows="4" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  required
                  placeholder="Share your sovereign journey..."
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Processing...' : 'Anchor Identity to Web3'}
              </button>
            </form>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary-container)' }}>
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>System Status:</p>
            <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>{status || 'Awaiting input...'}</p>
          </div>
        </section>

        <section>
           <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <h3>Identity Ledger</h3>
               <button className="btn btn-secondary" onClick={loadProfile} disabled={!ipfsHash || loading}>
                 Fetch Profile
               </button>
             </div>

             {ipfsHash && (
               <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: 'var(--radius-sm)' }}>
                 <p style={{ fontSize: '12px', color: 'var(--primary-container)', wordBreak: 'break-all' }}>
                   <strong>Active CID:</strong> {ipfsHash}
                 </p>
               </div>
             )}

             {profileData ? (
               <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--surface-container-highest)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', border: '1px solid var(--outline-variant)' }}>
                       <span style={{ fontSize: '24px' }}>👾</span>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{profileData.name}</h2>
                      <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0, 240, 255, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                         <span className="pulse-dot" style={{ width: '6px', height: '6px', marginRight: '6px' }}></span>
                         <span style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>AI Verified</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '4px', textTransform: 'uppercase' }}>Biography</p>
                    <p style={{ color: 'var(--on-surface)', background: 'var(--surface-container-lowest)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                      {profileData.bio}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '4px', textTransform: 'uppercase' }}>Wallet Address</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--secondary-container)' }}>{profileData.address}</p>
                  </div>
               </div>
             ) : (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--outline-variant)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--outline)' }}>No identity loaded.</p>
               </div>
             )}
           </div>
        </section>
      </main>
    </div>
  );
}

export default App;
