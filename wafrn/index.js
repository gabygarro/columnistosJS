import axios from 'axios';

const WAFRN_URL = 'https://app.wafrn.net';

const wafrn = async () => {
  const { data: { success, token }} = await axios.post(
    `${WAFRN_URL}/api/login`,
    {
      email: process.env.WAFRN_EMAIL,
      password: process.env.WAFRN_PASSWORD
    }
  );
  if (success !== true) {
    console.log('Wafrn login failed');
    return;
  }
  const response = await axios.post(
    `${WAFRN_URL}/api/v3/createPost`,
    {
      content: "probando desde nodejs",
      content_warning: "",
      medias: [],
      privacy: 0,
      tags: ""
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

export default wafrn;
