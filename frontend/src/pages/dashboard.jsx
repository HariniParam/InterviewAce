import { useEffect, useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProtected = async () => {
      try {
        const res = await API.get('/dashboard');
        setData(res.data);
      } catch (err) {
        alert('Unauthorized');
        navigate('/signin');
      }
    };
    fetchProtected();
  }, [navigate]);

  return (
    <div>
      <h2>Dashboard</h2>
      {data ? <p>Welcome, user ID: {data.user.id}</p> : <p>Loading...</p>}
    </div>
  );
};

export default Dashboard;
