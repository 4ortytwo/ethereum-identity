import type { NextPage } from 'next';
import { Reducer, useReducer } from 'react';
import { Button, Container, Divider, Heading, Image, Input, Stack, Text, useToast } from '@chakra-ui/react';
import CeramicClient from '@ceramicnetwork/http-client';
import ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { EthereumAuthProvider, ThreeIdConnect } from '@3id/connect';
import { DID } from 'dids';
import { IDX, IDXOptions } from '@ceramicstudio/idx';

const endpoint = 'https://ceramic-clay.3boxlabs.com';

type State = {
  name: string;
  image: string;
  hasLoaded: boolean;
};

type Action =
  // | { type: 'name' }
  // | { type: 'image' }
  // | { type: 'hasLoaded' }
  | { type: 'setName'; payload: string }
  | { type: 'setImage'; payload: string }
  | { type: 'setHasLoaded'; payload: boolean };

const initialState: State = {
  name: '',
  image: '',
  hasLoaded: false,
};

const Home: NextPage = () => {
  const toast = useToast();

  const reducer: Reducer<State, Action> = (state, action) => {
    switch (action.type) {
      case 'setName':
        return { ...state, name: action.payload };
      case 'setImage':
        return { ...state, image: action.payload };
      case 'setHasLoaded':
        return { ...state, hasLoaded: action.payload };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const { name, image, hasLoaded } = state;

  const connect = async () => {
    return await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
  };

  const readProfile = async () => {
    const [address] = await connect();
    const ceramic = new CeramicClient(endpoint);
    const idx = new IDX({ ceramic });

    try {
      const data = await idx.get<{ name: string; avatar: string }>('basicProfile', `${address}@eip155:1`);
      console.log('data: ', data);
      if (data?.name) dispatch({ type: 'setName', payload: data.name });
      if (data?.avatar) dispatch({ type: 'setImage', payload: data.avatar });
      dispatch({ type: 'setHasLoaded', payload: true });
    } catch (error) {
      console.log('Error occurred: ', error);
      toast({
        title: 'Error occurred:',
        description: error?.message ?? '',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
      dispatch({ type: 'setHasLoaded', payload: true });
    }
  };

  const updateProfile = async () => {
    const [address] = await connect();
    const ceramic = new CeramicClient(endpoint);
    const threeIdConnect = new ThreeIdConnect();
    const provider = new EthereumAuthProvider(window.ethereum, address);

    await threeIdConnect.connect(provider);

    const did = new DID({
      provider: threeIdConnect.getDidProvider(),
      resolver: { ...ThreeIdResolver.getResolver(ceramic) },
    });

    await ceramic.setDID(did);
    await ceramic.did?.authenticate();

    const idx = new IDX({ ceramic });

    await idx.set('basicProfile', { name, avatar: image });

    console.log('Profile updated!');
    toast({
      title: 'Profile updated!',
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
  };

  return (
    <Container as={Stack}>
      <Heading textAlign="center">Hello World, it's the age of Web3 and this is a DID demo!</Heading>
      {/*<Text>{JSON.stringify(state, null, 2)}</Text>*/}
      {/*<Text>{hasLoaded ? 'LOADED' : 'loading'}</Text>*/}
      <Button onClick={readProfile}>Read Profile</Button>
      <Divider />
      <Input placeholder="Name" onChange={(e) => dispatch({ type: 'setName', payload: e.target.value })} />
      <Input placeholder="Profile Image" onChange={(e) => dispatch({ type: 'setImage', payload: e.target.value })} />
      {name && <Heading size="lg">{name}</Heading>}
      {image && <Image src={image} w="400px" alt={`${name}'s image`} />}
      {!image && !name && hasLoaded && <Heading>No profile, please create one...</Heading>}
      <Button onClick={updateProfile}>Set Profile</Button>
    </Container>
  );
};

export default Home;
