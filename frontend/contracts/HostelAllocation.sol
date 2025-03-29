// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HostelAllocation {
    struct Room {
        uint roomId;
        uint capacity;
        uint currentOccupancy;
        bool isAvailable;
        address[] occupants;
    }

    struct Hostel {
        string name;
        mapping(uint => Room) rooms;
        uint[] roomIds;
    }

    struct Student {
        address wallet;
        bool registered;
        string name;
        string regNumber;
        string allocatedHostel;
        uint allocatedRoom;
        string pendingHostel;
        uint pendingRoom;
    }

    struct PendingAllocation {
        address wallet;
        string hostelName;
        uint roomId;
    }

    mapping(string => Hostel) public hostels;
    string[] public hostelNames;
    mapping(address => bool) public admins;
    mapping(address => Student) public students;
    mapping(string => address) public regNumberToWallet; // Map regNumber to wallet
    PendingAllocation[] public pendingAllocations;
    address public owner;

    event RoomRequested(string hostelName, uint roomId, address wallet);
    event RoomAllocated(string hostelName, uint roomId, address wallet);
    event HostelAdded(string name);
    event StudentRegistered(address wallet, string name, string regNumber);
    event AdminAdded(address admin);
    event HostelDeleted(string name);
    event RoomDeleted(string hostelName, uint roomId);
    event StudentDeleted(address wallet);
    event AdminDeleted(address admin);

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin can perform this action");
        _;
    }

    function addAdmin(address _admin) public onlyAdmin {
        require(_admin != address(0), "Invalid admin address");
        require(!admins[_admin], "Address is already an admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function registerStudent(string memory _name, string memory _regNumber, address _wallet) public onlyAdmin {
        require(_wallet != address(0), "Invalid wallet address");
        require(!students[_wallet].registered, "Student already registered");
        require(regNumberToWallet[_regNumber] == address(0), "Registration number already used");
        students[_wallet] = Student(_wallet, true, _name, _regNumber, "", 0, "", 0);
        regNumberToWallet[_regNumber] = _wallet;
        emit StudentRegistered(_wallet, _name, _regNumber);
    }

    function addHostel(string memory _name) public onlyAdmin {
        require(bytes(_name).length > 0, "Hostel name cannot be empty");
        require(bytes(hostels[_name].name).length == 0, "Hostel already exists");
        hostelNames.push(_name);
        hostels[_name].name = _name;
        emit HostelAdded(_name);
    }

    function addRoom(string memory _hostelName, uint _roomId) public onlyAdmin {
        require(bytes(_hostelName).length > 0, "Hostel name cannot be empty");
        require(bytes(hostels[_hostelName].name).length != 0, "Hostel does not exist");
        require(hostels[_hostelName].rooms[_roomId].roomId == 0, "Room already exists");
        Room memory newRoom = Room({
            roomId: _roomId,
            capacity: 4,
            currentOccupancy: 0,
            isAvailable: true,
            occupants: new address[](4)
        });
        hostels[_hostelName].rooms[_roomId] = newRoom;
        hostels[_hostelName].roomIds.push(_roomId);
    }

    function requestRoom(string memory _hostelName, uint _roomId) public {
        address wallet = msg.sender;
        require(students[wallet].registered, "Student not registered");
        require(bytes(students[wallet].allocatedHostel).length == 0, "Student already allocated");
        require(bytes(students[wallet].pendingHostel).length == 0, "Student has a pending request");
        require(bytes(hostels[_hostelName].name).length != 0, "Hostel does not exist");
        require(hostels[_hostelName].rooms[_roomId].roomId != 0, "Room does not exist");

        Room storage room = hostels[_hostelName].rooms[_roomId];
        require(room.isAvailable, "Room is not available");
        require(room.currentOccupancy < 4, "Room is full");

        students[wallet].pendingHostel = _hostelName;
        students[wallet].pendingRoom = _roomId;
        pendingAllocations.push(PendingAllocation(wallet, _hostelName, _roomId));

        emit RoomRequested(_hostelName, _roomId, wallet);
    }

    function approveAllocation(uint _index) public onlyAdmin {
        require(_index < pendingAllocations.length, "Invalid pending allocation index");

        PendingAllocation memory pending = pendingAllocations[_index];
        address wallet = pending.wallet;
        string memory hostelName = pending.hostelName;
        uint roomId = pending.roomId;

        Student storage student = students[wallet];
        require(bytes(student.pendingHostel).length != 0, "No pending request for this student");
        require(
            keccak256(bytes(student.pendingHostel)) == keccak256(bytes(hostelName)) &&
            student.pendingRoom == roomId,
            "Pending request does not match"
        );

        Room storage room = hostels[hostelName].rooms[roomId];
        require(room.isAvailable, "Room is not available");
        require(room.currentOccupancy < 4, "Room is full");

        room.occupants[room.currentOccupancy] = wallet;
        room.currentOccupancy++;
        if (room.currentOccupancy == 4) {
            room.isAvailable = false;
        }

        student.allocatedHostel = hostelName;
        student.allocatedRoom = roomId;
        student.pendingHostel = "";
        student.pendingRoom = 0;

        pendingAllocations[_index] = pendingAllocations[pendingAllocations.length - 1];
        pendingAllocations.pop();

        emit RoomAllocated(hostelName, roomId, wallet);
    }

    function deleteHostel(string memory _name) public onlyAdmin {
        require(bytes(hostels[_name].name).length != 0, "Hostel does not exist");
        for (uint i = 0; i < hostelNames.length; i++) {
            if (keccak256(bytes(hostelNames[i])) == keccak256(bytes(_name))) {
                hostelNames[i] = hostelNames[hostelNames.length - 1];
                hostelNames.pop();
                break;
            }
        }
        delete hostels[_name];
        emit HostelDeleted(_name);
    }

    function deleteRoom(string memory _hostelName, uint _roomId) public onlyAdmin {
        require(bytes(hostels[_hostelName].name).length != 0, "Hostel does not exist");
        Room storage room = hostels[_hostelName].rooms[_roomId];
        require(room.roomId != 0, "Room does not exist");
        require(room.currentOccupancy == 0, "Cannot delete room with occupants");

        for (uint i = 0; i < hostels[_hostelName].roomIds.length; i++) {
            if (hostels[_hostelName].roomIds[i] == _roomId) {
                hostels[_hostelName].roomIds[i] = hostels[_hostelName].roomIds[hostels[_hostelName].roomIds.length - 1];
                hostels[_hostelName].roomIds.pop();
                break;
            }
        }
        delete hostels[_hostelName].rooms[_roomId];
        emit RoomDeleted(_hostelName, _roomId);
    }

    function deleteStudent(address _wallet) public onlyAdmin {
        require(students[_wallet].registered, "Student not registered");
        Student storage student = students[_wallet];
        if (bytes(student.allocatedHostel).length != 0) {
            Room storage room = hostels[student.allocatedHostel].rooms[student.allocatedRoom];
            for (uint i = 0; i < room.currentOccupancy; i++) {
                if (room.occupants[i] == _wallet) {
                    room.occupants[i] = room.occupants[room.currentOccupancy - 1];
                    room.occupants[room.currentOccupancy - 1] = address(0);
                    room.currentOccupancy--;
                    room.isAvailable = true;
                    break;
                }
            }
        }
        for (uint i = 0; i < pendingAllocations.length; i++) {
            if (pendingAllocations[i].wallet == _wallet) {
                pendingAllocations[i] = pendingAllocations[pendingAllocations.length - 1];
                pendingAllocations.pop();
                break;
            }
        }
        delete regNumberToWallet[student.regNumber];
        delete students[_wallet];
        emit StudentDeleted(_wallet);
    }

    function deleteAdmin(address _admin) public onlyAdmin {
        require(admins[_admin], "Address is not an admin");
        require(_admin != owner, "Cannot delete the owner");
        require(_admin != msg.sender, "Cannot delete yourself");
        delete admins[_admin];
        emit AdminDeleted(_admin);
    }

    function getRoomInfo(string memory _hostelName, uint _roomId)
        public view returns (uint, uint, bool, uint, address[] memory) {
        Room memory room = hostels[_hostelName].rooms[_roomId];
        require(room.roomId != 0, "Room does not exist");
        return (room.roomId, room.capacity, room.isAvailable, room.currentOccupancy, room.occupants);
    }

    function getHostelRoomIds(string memory _hostelName) public view returns (uint[] memory) {
        require(bytes(hostels[_hostelName].name).length != 0, "Hostel does not exist");
        return hostels[_hostelName].roomIds;
    }

    function getStudentInfo(address _wallet) public view returns (string memory, string memory, string memory, uint, string memory, uint) {
        Student memory student = students[_wallet];
        require(student.registered, "Student not registered");
        return (student.name, student.regNumber, student.allocatedHostel, student.allocatedRoom, student.pendingHostel, student.pendingRoom);
    }

    function getPendingAllocations() public view returns (PendingAllocation[] memory) {
        return pendingAllocations;
    }

    function getStudentByRegNumber(string memory _regNumber) public view returns (address) {
        return regNumberToWallet[_regNumber];
    }
}