import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import api from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashAlt, faSort, faSortUp, faSortDown, faSearch, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';

const UserList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const prevUsersRef = useRef([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const fetchUsers = async () => {
        try {
            let response;
            if (searchTerm.trim() === '') {
                response = await api.get('/users');
            } else {
                response = await api.get(`/users/search?query=${searchTerm}`);
            }
            if (JSON.stringify(response.data) !== JSON.stringify(prevUsersRef.current)) {
                setUsers(response.data);
                prevUsersRef.current = response.data;
            }
            
        } catch (error) {
            console.error('Une erreur est survenue à la récupération des données des utilisateurs:', error);
            toast.error('Une erreur est survenue à la récupération des données des utilisateurs.');
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        let isActive = true;

        const fetchData = async () => {
            if (isActive && document.visibilityState === 'visible') {
                await fetchUsers();
            }
        };

        if (searchTerm.trim() !== '') {
            setSearchLoading(true);
        }

        const delayDebounceFn = setTimeout(fetchData, searchTerm.trim() === '' ? 0 : 500);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchUsers();
            }
        }, 10000);

        return () => {
            isActive = false;
            clearTimeout(delayDebounceFn);
            clearInterval(interval);
        };
    }, [searchTerm]);

    const handleDelete = (userId, username) => {
        confirmAlert({
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`,
            buttons: [
                {
                    label: <FontAwesomeIcon icon={faCheck} />,
                    onClick: async () => {
                        try {
                            await api.delete(`/users/${userId}`);
                            toast.success('Le compte utilisateur a été supprimé avec succès.');
                            fetchUsers();
                        } catch (error) {
                            console.error('Une erreur est survenue à la suppression du compte utilisateur:', error);
                            toast.error(error.response?.data?.message || 'Une erreur est survenue à la suppression du compte utilisateur.');
                        }
                    },
                },
                {
                    label: <FontAwesomeIcon icon={faTimes} />,
                    onClick: () => {},
                },
            ],
        });
    };

    const handleSort = (column) => {
        const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortColumn(column);
        setSortDirection(direction);

        const sortedUsers = [...users].sort((a, b) => {
            const aValue = typeof a[column] === 'string' ? a[column].toLowerCase() : a[column];
            const bValue = typeof b[column] === 'string' ? b[column].toLowerCase() : b[column];

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setUsers(sortedUsers);
    };

    const getSortIcon = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? faSortUp : faSortDown;
        }
        return faSort;
    };

    if (!user || user.TitreUtil !== 'admin') {
        navigate('/unauthorized');
        return null;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Liste des utilisateurs</h2>

            <div className="flex justify-between items-center mb-24">
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-all duration-200 flex items-center">
                    <FontAwesomeIcon icon={faPlus} />
                </Link>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <label htmlFor="filterName" className="mr-2"><FontAwesomeIcon icon={faSearch} /></label>
                        <input
                            type="text"
                            placeholder="Nom d'utilisateur..."
                            className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-48"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                title="Effacer la recherche"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {searchLoading ? (
                <div className="flex justify-center items-center">
                    <LoadingSpinner size="md"/>
                </div>
            ) : users.length === 0 ? (
                <p className="text-center text-gray-600">Aucun utilisateur trouvé.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumUtil')}>
                                    ID <FontAwesomeIcon icon={getSortIcon('NumUtil')} />
                                </th>
                                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NomUtil')}>
                                    Nom d'utilisateur <FontAwesomeIcon icon={getSortIcon('NomUtil')} />
                                </th>
                                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('NumEmp')}>
                                    Numéro employé <FontAwesomeIcon icon={getSortIcon('NumEmp')} />
                                </th>
                                <th className="py-3 px-6 cursor-pointer" onClick={() => handleSort('TitreUtil')}>
                                    Rôle <FontAwesomeIcon icon={getSortIcon('TitreUtil')} />
                                </th>
                                <th className="py-3 px-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {users.map((u) => (
                                <tr key={u.NumUtil} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                                    <td className="py-3 px-6 text-left">{u.NumUtil}</td>
                                    <td className="py-3 px-6 text-left">{u.NomUtil}</td>
                                    <td className="py-3 px-6 text-left">{u.NumEmp || '-'}</td>
                                    <td className="py-3 px-6 text-left">{u.TitreUtil}</td>
                                    <td className="py-3 px-6 text-center">
                                        {u.TitreUtil !== 'admin' && ( 
                                            <button
                                                onClick={() => handleDelete(u.NumUtil, u.NomUtil)}
                                                className="w-6 h-6 transform hover:text-red-500 hover:scale-110 transition-transform duration-150"
                                            >
                                                <FontAwesomeIcon icon={faTrashAlt} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>    
            )}
        </div>
    );
};

export default UserList;