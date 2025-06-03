#include <iostream>
#include <vector>

using namespace std;

void line() {
    cout << "*******************************************************************" << endl;
}

void getValidSize(int &size) {
    while (true) {
        cin >> size;
        if (cin.fail() || size <= 0) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input. Please enter a positive whole number: ";
        } else {
            break;
        }
    }
}

void getValidNumber(double &input) {
    while (true) {
        cin >> input;
        if (cin.fail()) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input. Please enter a valid number: ";
        } else {
            break;
        }
    }
}

int main() {
    vector<double> arr1, arr2, mergedArray;
    int size1, size2;
    double num;

    line();
    cout << "How many would you want to place in the first array? (max 10): ";
    getValidSize(size1);
    if (size1 > 10) size1 = 10;
    cout << "Enter " << size1 << " elements: ";
    for (int i = 0; i < size1; i++) {
        getValidNumber(num);
        arr1.push_back(num);
    }

    line();
    cout << "How many would you want to place in the second array? (max 10): ";
    getValidSize(size2);
    if (size2 > 10) size2 = 10;
    cout << "Enter " << size2 << " elements: ";
    for (int i = 0; i < size2; i++) {
        getValidNumber(num);
        arr2.push_back(num);
    }

    for (int i = 0; i < size1; i++) mergedArray.push_back(arr1[i]);
    for (int i = 0; i < size2; i++) mergedArray.push_back(arr2[i]);

    int n = mergedArray.size();
    int maxIndex;
    double temp;
    for (int i = 0; i < n - 1; i++) {
        maxIndex = i;
        for (int j = i + 1; j < n; j++) {
            if (mergedArray[j] > mergedArray[maxIndex]) {
                maxIndex = j;
            }
        }
        temp = mergedArray[i];
        mergedArray[i] = mergedArray[maxIndex];
        mergedArray[maxIndex] = temp;
    }

    line();
    cout << "Merged and sorted array: ";
    for (int i = 0; i < n; i++) {
        cout << mergedArray[i] << " ";
    }
    cout << endl;

    return 0;
}