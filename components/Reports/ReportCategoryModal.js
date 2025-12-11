// ReportCategoryModal.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../../styles/reportsStyles';

export default function ReportCategoryModal({
  visible,
  report,
  role,
  onClose,
  onUpdateStatus,
  updatingId,
}) {
  const [masterList, setMasterList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [subcategoryList, setSubcategoryList] = useState([]);

  const [masterCategory, setMasterCategory] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');

  // Fetch master categories
  const fetchMasterCategories = async () => {
    try {
      const res = await fetch(
        'https://api.daalohas.com/api/v1/master-category',
      );
      const data = await res.json();
      let list = data.categories || [];

      // Include current report master if not in list
      if (
        report?.masterCategory &&
        !list.find(m => m._id === report.masterCategory._id)
      ) {
        list = [report.masterCategory, ...list];
      }

      setMasterList(list);
    } catch (err) {
      console.log('Master error', err);
    }
  };

  // Fetch categories for a master
  const fetchCategoryList = async masterId => {
    if (!masterId) return;
    try {
      const res = await fetch(
        `https://api.daalohas.com/api/v1/report/list-category?masterCategory=${masterId}`,
      );
      const data = await res.json();
      setCategoryList(data.categories || []);
    } catch (err) {
      console.log('Category error', err);
    }
  };

  // Fetch subcategories for a category
  const fetchSubcategoryList = async categoryId => {
    if (!categoryId) return;
    try {
      const res = await fetch(
        `https://api.daalohas.com/api/v1/report/list-subcategory?category=${categoryId}`,
      );
      const data = await res.json();
      setSubcategoryList(data.subCategories || []);
    } catch (err) {
      console.log('Subcategory error', err);
    }
  };

  // Prefill when modal opens
  useEffect(() => {
    if (!visible || !report) return;

    // Fetch master categories first
    fetchMasterCategories();

    const mc = report?.masterCategory?._id || '';
    const c = report?.category?._id || '';
    const sc = report?.subcategory?._id || '';

    setMasterCategory(mc);
    setCategory(c);
    setSubcategory(sc);

    if (mc) fetchCategoryList(mc);
    if (c) fetchSubcategoryList(c);
  }, [visible, report]);

  console.log(report);
  console.log('masterCategory', masterCategory);
  useEffect(() => {
    if (!masterCategory) return;
    fetchCategoryList(masterCategory);

    if (report?.masterCategory?._id !== masterCategory) {
      setCategory('');
      setSubcategory('');
      setSubcategoryList([]);
    }
  }, [masterCategory, report]);

  // When category changes: fetch subcategories and reset subcategory only if changed
  useEffect(() => {
    if (!category) return;
    fetchSubcategoryList(category);

    if (report?.category?._id !== category) {
      setSubcategory('');
    }
  }, [category, report]);

  if (!report) return null;

  const isUpdating = updatingId === report._id;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{report.propertyId?.title}</Text>

            {report.image?.url && (
              <Image source={{ uri: report.image.url }} style={styles.image} />
            )}

            {/* MASTER CATEGORY */}
            <Text style={styles.text}>Master Category</Text>
            <Picker
              selectedValue={masterCategory}
              onValueChange={v => setMasterCategory(v)}
            >
              <Picker.Item label="Select Master Category" value="" />
              {masterList.map(m => (
                <Picker.Item key={m._id} label={m.name} value={m._id} />
              ))}
            </Picker>

            {/* CATEGORY */}
            <Text style={styles.text}>Category</Text>
            <Picker
              selectedValue={category}
              enabled={!!masterCategory}
              onValueChange={v => setCategory(v)}
            >
              <Picker.Item label="Select Category" value="" />
              {categoryList.map(c => (
                <Picker.Item key={c._id} label={c.name} value={c._id} />
              ))}
            </Picker>

            {/* SUBCATEGORY */}
            <Text style={styles.text}>Subcategory</Text>
            <Picker
              selectedValue={subcategory}
              enabled={!!category}
              onValueChange={v => setSubcategory(v)}
            >
              <Picker.Item label="Select Subcategory" value="" />
              {subcategoryList.map(s => (
                <Picker.Item key={s._id} label={s.name} value={s._id} />
              ))}
            </Picker>

            <Text style={styles.text}>Notes: {report.notes || 'No notes'}</Text>

            {/* ACTION BUTTONS */}
            {(role === 'admin' || role === 'operation') && (
              <>
                {report.status === 'Pending' && (
                  <TouchableOpacity
                    disabled={isUpdating}
                    style={[styles.button, isUpdating && { opacity: 0.6 }]}
                    onPress={() =>
                      onUpdateStatus(
                        report._id,
                        'Accepted',
                        masterCategory,
                        category,
                        subcategory,
                      )
                    }
                  >
                    <Text style={styles.buttonText}>
                      {isUpdating ? 'Updating...' : 'Accept'}
                    </Text>
                  </TouchableOpacity>
                )}

                {report.status === 'Accepted' && (
                  <TouchableOpacity
                    disabled={isUpdating}
                    style={[
                      styles.button,
                      { backgroundColor: 'blue' },
                      isUpdating && { opacity: 0.6 },
                    ]}
                    onPress={() =>
                      onUpdateStatus(
                        report._id,
                        'Resolved',
                        masterCategory,
                        category,
                        subcategory,
                      )
                    }
                  >
                    <Text style={styles.buttonText}>
                      {isUpdating ? 'Updating...' : 'Resolve'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* CLOSE */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
