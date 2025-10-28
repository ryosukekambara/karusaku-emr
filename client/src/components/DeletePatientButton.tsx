
import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import config from '../config/api';

interface DeleteButtonProps {

  patientId: string;

  patientName: string;

}

const DeletePatientButton: React.FC<DeleteButtonProps> = ({ patientId, patientName }) => {

  const [showConfirm, setShowConfirm] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  

  const handleDelete = async () => {

    setIsDeleting(true);

    try {

      const token = localStorage.getItem('token');

      const response = await fetch(`${config.apiBaseUrl}/api/patients/${patientId}`, {

        method: 'DELETE',

        headers: {

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json'

        }

      });

      

      if (response.ok) {

        alert('患者を削除しました');

        navigate('/patients');

      } else {

        const data = await response.json();

        alert(data.error || '削除に失敗しました');

      }

    } catch (error) {

      alert('削除に失敗しました');

    } finally {

      setIsDeleting(false);

      setShowConfirm(false);

    }

  };

  

  return (

    <>

      <button onClick={() => setShowConfirm(true)} className="btn btn-danger">

        削除

      </button>

      

      {showConfirm && (

        <div style={{

          position: 'fixed',

          top: 0,

          left: 0,

          right: 0,

          bottom: 0,

          backgroundColor: 'rgba(0,0,0,0.5)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          zIndex: 1000

        }}>

          <div style={{

            backgroundColor: 'white',

            padding: '30px',

            borderRadius: '8px',

            maxWidth: '400px'

          }}>

            <h3>本当に削除しますか？</h3>

            <p>患者: <strong>{patientName}</strong></p>

            <p style={{ color: '#666', fontSize: '14px' }}>

              この操作は取り消せません。

            </p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>

              <button 

                onClick={() => setShowConfirm(false)} 

                className="btn btn-secondary"

                disabled={isDeleting}

              >

                キャンセル

              </button>

              <button 

                onClick={handleDelete} 

                className="btn btn-danger"

                disabled={isDeleting}

              >

                {isDeleting ? '削除中...' : '削除'}

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

};

export default DeletePatientButton;

